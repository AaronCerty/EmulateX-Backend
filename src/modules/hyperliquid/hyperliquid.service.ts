import { RedisService } from '@liaoliaots/nestjs-redis';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Signature, ethers } from 'ethers';
import e from 'express';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { ERROR } from 'src/constants/exception.constant';
import { TransactionEntity } from 'src/entities/transaction.entity';
import {
  HyperliquidTransferSpotToPerpDomain,
  HyperliquidTransferSpotToPerpType,
  HyperliquidUsdSendDomain,
  HyperliquidUsdSendType,
  HyperliquidWithdrawDomain,
  HyperliquidWithdrawType,
  hyperliquidChain,
  isMainnet,
  signatureChainId,
} from 'src/modules/hyperliquid/dto/eip712-type.dto';
import { KafkaService } from 'src/modules/kafka/kafka.service';
import { BaseException } from 'src/shared/filters/exception.filter';
import { BulkOrderRequest, Grouping, Hyperliquid, OrderRequest } from 'src/shared/libs/hyperliquid/src/browser';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { sleep } from 'src/shared/utils/sleep';
import { DataSource } from 'typeorm';
import WebSocket from 'ws';

@Injectable()
export class HyperliquidService {
  private readonly logger = new Logger(HyperliquidService.name);

  private redisInstance: Redis;
  private readonly HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz';
  private readonly HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';

  // hyperliquid accept deposit via USDC on arbitrum only
  private readonly HYPERLIQUID_BRIDGE_ADDRESS = '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';
  private readonly ARB_USDC_DECIMAL = 6;
  private readonly ARB_USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';

  // testnet constants
  private readonly HYPERLIQUID_API_URL_TESTNET = 'https://api.hyperliquid-testnet.xyz';
  private readonly HYPERLIQUID_WS_URL_TESTNET = 'wss://api.hyperliquid-testnet.xyz/ws';

  private readonly HYPERLIQUID_BRIDGE_ADDRESS_TESTNET = '0x1baAbB04529D43a73232B713C0FE471f7c7334d5';
  private readonly ARB_USDC_DECIMAL_TESTNET = 6;
  private readonly ARB_USDC_ADDRESS_TESTNET = '0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89';

  // Map to store WebSocket connections by user ID
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly kafkaService: KafkaService,
    private readonly configService: ApiConfigService,
  ) {
    this.redisInstance = this.redisService.getClient(COMMON_CONSTANT.REDIS_DEFAULT_NAMESPACE);

    setInterval(() => {
      this.logger.log('all ws connections', this.wsConnections.keys());
    }, 60 * 1000);
  }

  /**
   * Initialize WebSocket connections for all leaders and copiers
   */
  public async syncWsConnections() {
    try {
      // Fetch all copiers with fund wallets
      const copiers = await this.dataSource.manager.query(
        `SELECT c."fund_wallet_address" FROM copiers c WHERE c."fund_wallet_address" IS NOT NULL`,
      );

      this.logger.log(`Found ${copiers.length} copiers with fund wallets`);

      // Set up WebSocket connections for all copiers
      for (const copier of copiers) {
        if (copier.fund_wallet_address) {
          this.logger.log(`Setting up WebSocket connection for copier wallet: ${copier.fund_wallet_address}`);
          this.ensureUserFillsSubscription(copier.fund_wallet_address, true);
        }
      }

      // Fetch all leaders
      const leaders = await this.dataSource.manager.query(
        `SELECT u."wallet_address" FROM leaders l INNER JOIN users u ON u.id = l."user_id" WHERE u."wallet_address" IS NOT NULL`,
      );

      this.logger.log(`Found ${leaders.length} leaders with wallet addresses`);

      // Set up WebSocket connections for all leaders
      for (const leader of leaders) {
        if (leader.wallet_address) {
          this.logger.log(`Setting up WebSocket connection for leader wallet: ${leader.wallet_address}`);
          this.ensureUserFillsSubscription(leader.wallet_address, false);
        }
      }

      this.logger.log('WebSocket connections initialized successfully');
    } catch (error) {
      this.logger.error(`Error initializing WebSocket connections: ${error.message}`, error.stack);
    }
  }

  async getTokenMetadata() {
    const CACHE_KEY = 'hyperliquid:token-metadata';
    const CACHE_TTL = 3600 * 24; // Cache for 1 hour

    try {
      // Try to get data from cache first
      const cachedData = await this.redisInstance.get(CACHE_KEY);

      if (cachedData) {
        this.logger.log('Retrieved token metadata from cache');
        return JSON.parse(cachedData);
      }

      // If not in cache, fetch from API
      this.logger.log('Fetching token metadata from Hyperliquid API');
      const requestBody = {
        type: 'spotMeta',
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
          requestBody,
        ),
      );

      if (response.status === 200) {
        // Store in cache
        await this.redisInstance.set(CACHE_KEY, JSON.stringify(response.data), 'EX', CACHE_TTL);
        this.logger.log(`Cached token metadata for ${CACHE_TTL} seconds`);
        return response.data;
      }

      return [];
    } catch (error) {
      this.logger.error(`Error fetching token metadata: ${error.message}`, error.stack);
      return [];
    }
  }

  async getTokenPrepMetadata() {
    const CACHE_KEY = 'hyperliquid:token-prep-metadata';
    const CACHE_TTL = 3600 * 24; // Cache for 1 day

    try {
      // Try to get data from cache first
      const cachedData = await this.redisInstance.get(CACHE_KEY);

      if (cachedData) {
        this.logger.log('Retrieved token metadata from cache');
        return JSON.parse(cachedData);
      }

      // If not in cache, fetch from API
      this.logger.log('Fetching token metadata from Hyperliquid API');
      const requestBody = {
        type: 'meta',
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
          requestBody,
        ),
      );

      if (response.status === 200) {
        // Store in cache
        await this.redisInstance.set(CACHE_KEY, JSON.stringify(response.data), 'EX', CACHE_TTL);
        this.logger.log(`Cached token metadata for ${CACHE_TTL} seconds`);
        return response.data;
      }

      return [];
    } catch (error) {
      this.logger.error(`Error fetching token metadata: ${error.message}`, error.stack);
      return [];
    }
  }

  async getPairById(id: string) {
    const tokenMetaData = await this.getTokenMetadata();
    const pairData = tokenMetaData.universe.find((pair) => pair.name === id);
    const baseTokenId = pairData.tokens[0];
    const quoteTokenId = pairData.tokens[1];

    const baseToken = tokenMetaData.tokens.find((token) => token.index === baseTokenId);
    const quoteToken = tokenMetaData.tokens.find((token) => token.index === quoteTokenId);

    return { baseToken, quoteToken };
  }

  async getFillsByWalletAddress(walletAddress: string, startTime: number, endTime: number): Promise<any[]> {
    try {
      const requestBody = {
        type: 'userFillsByTime',
        user: walletAddress.toLowerCase(),
        startTime,
        endTime,
        aggregateByTime: true,
      };
      const response = await firstValueFrom(
        this.httpService.post(
          `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
          requestBody,
        ),
      );
      if (response.status === 200 && Array.isArray(response.data)) {
        this.logger.log(`Fetched ${response.data.length} fills for wallet ${walletAddress}`);
        return response.data;
      }
      this.logger.warn(`Unexpected response from Hyperliquid API: ${JSON.stringify(response.data)}`);
      return [];
    } catch (error) {
      this.logger.error(`Error fetching Hyperliquid fills: ${error.message}`, error.stack);
      return [];
    }
  }

  async getWalletPortfolio(walletAddress: string): Promise<any[]> {
    const requestBody = {
      type: 'portfolio',
      user: walletAddress.toLowerCase(),
    };

    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
        requestBody,
      ),
    );
    if (response.status === 200 && Array.isArray(response.data)) {
      this.logger.log(`Fetched ${response.data.length} fills for wallet ${walletAddress}`);
      return response.data;
    }
    this.logger.warn(`Unexpected response from Hyperliquid API: ${JSON.stringify(response.data)}`);
    return [];
  }

  /**
   * Close all WebSocket connections
   */
  /**
   * Close all WebSocket connections
   */
  closeAllConnections(): void {
    for (const [userId, ws] of this.wsConnections.entries()) {
      ws.close();
      this.logger.log(`Closed WebSocket connection for user ${userId}`);
    }
    this.wsConnections.clear();
    this.logger.log('All WebSocket connections closed');
  }

  async executeOrder(
    walletAddress: string,
    privateKey: string,
    originTransaction: TransactionEntity,
    scaleFactor = 1.0,
    slippage = 1.0,
    fixedAmountPerTrade: number,
  ): Promise<{ orderId: string | undefined; errorMessage: string | undefined }> {
    try {
      if (!originTransaction.metadata) {
        throw new Error('Transaction metadata is missing');
      }

      const tokenPrepMetadata = await this.getTokenPrepMetadata();

      const metadata = JSON.parse(originTransaction.metadata);

      const client = new Hyperliquid({
        privateKey: privateKey,
        testnet: !isMainnet,
        enableWs: false,
      });

      // Ensure the client is initialized before making any API calls
      await client.ensureInitialized();

      // Determine if it's a buy or sell order based on the direction
      // B = Buy, S = Sell in Hyperliquid API
      const isBuy = metadata.side === 'B';

      // Determine the size based on allocation type
      let size: number;

      if (Number(fixedAmountPerTrade)) {
        // If using fixed amount per trade, use that amount directly
        this.logger.log(`Using fixed amount per trade: ${fixedAmountPerTrade}`);
        size = Number(fixedAmountPerTrade.toFixed(2));
      } else {
        // Otherwise apply scale factor to the leader's size
        this.logger.log(`Using scale factor: ${scaleFactor} on size: ${metadata.sz}`);
        size = Number(parseFloat(metadata.sz) * scaleFactor);
        this.logger.log(`Calculated size: ${size}`);
      }

      // Check if the current market price is within the allowed slippage range
      try {
        // First, get the list of all available assets to check if the asset exists
        const allAssets = await client.info.getAllAssets();
        this.logger.log('Available assets:', JSON.stringify(allAssets));

        // Check if the asset exists in the perpetual assets
        let assetSymbol = metadata.coin;

        const tokenPrep = tokenPrepMetadata.universe.find((token) => token.name === assetSymbol);

        // check if already has the opening position for coin
        const activePositions = await this.getUserActivePositions(walletAddress);
        const hasOpeningPosition =
          activePositions && activePositions.some((position) => position.position.coin === assetSymbol);

        const assetWithSuffix = `${assetSymbol}-PERP`;

        // Check if the asset exists as is or with the -PERP suffix
        if (!allAssets.perp.includes(assetSymbol) && !allAssets.perp.includes(assetWithSuffix)) {
          this.logger.error(
            `Asset ${assetSymbol} not found in available perpetual assets. Available assets: ${allAssets.perp.join(', ')}`,
          );
          throw new Error(`Asset ${assetSymbol} not found in available perpetual assets`);
        }

        // If the asset exists with the -PERP suffix but not without it, use the version with the suffix
        if (!allAssets.perp.includes(assetSymbol) && allAssets.perp.includes(assetWithSuffix)) {
          assetSymbol = assetWithSuffix;
          this.logger.log(`Using asset with -PERP suffix: ${assetSymbol}`);
        }

        // Get the current L2 book data for the asset
        // Note: The Hyperliquid library handles the asset ID conversion internally
        const l2BookData = await client.info.getL2Book(assetSymbol);

        // Extract the best bid and ask prices
        const leaderPrice = parseFloat(metadata.px);
        let currentMarketPrice: number;

        if (isBuy && l2BookData.levels[1] && l2BookData.levels[1].length > 0) {
          // For buy orders, use the lowest ask price
          currentMarketPrice = parseFloat(l2BookData.levels[1][0].px);
          this.logger.log(`Using lowest ask price: ${currentMarketPrice} for buy order`);
        } else if (!isBuy && l2BookData.levels[0] && l2BookData.levels[0].length > 0) {
          // For sell orders, use the highest bid price
          currentMarketPrice = parseFloat(l2BookData.levels[0][0].px);
          this.logger.log(`Using highest bid price: ${currentMarketPrice} for sell order`);
        } else {
          throw new Error(`Could not determine current market price for ${assetSymbol}`);
        }

        // Check if the price deviation is within the allowed slippage
        const priceDeviation = Math.abs(currentMarketPrice - leaderPrice);
        const deviationPercentage = priceDeviation / leaderPrice;

        this.logger.log(
          `Leader price: ${leaderPrice}, Current price: ${currentMarketPrice}, ` +
            `Deviation: ${(deviationPercentage * 100).toFixed(2)}%, Max allowed: ${(slippage * 100).toFixed(2)}%`,
        );

        if (deviationPercentage > slippage) {
          throw new Error(
            `Price deviation (${(deviationPercentage * 100).toFixed(2)}%) exceeds maximum allowed slippage (${(slippage * 100).toFixed(2)}%)`,
          );
        }

        // First, set leverage mode to isolated for this asset (1x leverage)
        await client.exchange.updateLeverage(assetSymbol, 'isolated', 1);

        // slippage 8% for frontend market order
        const priceAdjustmentFactor = isBuy ? 1.08 : 0.92;
        let adjustedLimitPrice = (currentMarketPrice * priceAdjustmentFactor).toFixed(3);

        const fixed = Number(tokenPrep.szDecimals);
        this.logger.log(`Fixed size: ${fixed}`);
        size = Number(size.toFixed(fixed));

        const fixedPrice = l2BookData.levels[0][0].px.toString().split('.')[1]?.length || 0;
        adjustedLimitPrice = Number(adjustedLimitPrice).toFixed(fixedPrice);

        this.logger.log('>>> order data');
        this.logger.log(l2BookData.levels[0][0]);
        this.logger.log(size);
        this.logger.log(adjustedLimitPrice);

        this.logger.log(
          `Using adjusted limit price: ${adjustedLimitPrice} (original market price: ${currentMarketPrice})`,
        );

        // Create the order request using the Hyperliquid library's format
        const orderRequest: OrderRequest = {
          coin: assetSymbol,
          is_buy: isBuy,
          sz: size,
          limit_px: adjustedLimitPrice,
          reduce_only: hasOpeningPosition && !isBuy,
          order_type: {
            limit: {
              // tif: 'Gtc',
              tif: 'FrontendMarket',
            },
          },
          grouping: 'na' as Grouping, // Default grouping
        };

        this.logger.log(`Placing order with Hyperliquid library: ${JSON.stringify(orderRequest)}`);

        // Place the order using the Hyperliquid library
        const orderResponse = await client.exchange.placeOrder({
          orders: [orderRequest],
        });

        this.logger.log(`Order response: ${JSON.stringify(orderResponse)}`);

        // Parse the response to get the order ID
        if (orderResponse && orderResponse.status === 'ok') {
          const statuses = orderResponse.response?.data?.statuses;

          if (statuses && statuses.length > 0) {
            if (statuses[0].resting) {
              this.logger.log(`Order placed successfully with ID: ${statuses[0].resting.oid}`);
              return {
                orderId: statuses[0].resting.oid.toString(),
                errorMessage: undefined,
              };
            } else if (statuses[0].filled) {
              this.logger.log(`Order filled immediately with ID: ${statuses[0].filled.oid}`);
              return {
                orderId: statuses[0].filled.oid.toString(),
                errorMessage: undefined,
              };
            } else if (statuses[0].error) {
              throw new Error(`Hyperliquid API error: ${statuses[0].error}`);
            }
          }
        }

        throw new Error(`Unexpected response from Hyperliquid API: ${JSON.stringify(orderResponse)}`);
      } catch (error) {
        throw new Error(`Order execution failed: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error executing order:`, error);
      return {
        orderId: undefined,
        errorMessage: error.message,
      };
    }
  }

  ensureUserFillsSubscription(walletAddress: string, isCopier = false): boolean {
    // Normalize the wallet address
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if we already have a connection for this user
    for (const [userId, ws] of this.wsConnections.entries()) {
      if (userId.toLowerCase() === normalizedAddress && ws.readyState === WebSocket.OPEN) {
        this.logger.debug(`WebSocket connection already exists for wallet ${normalizedAddress}`);
        return false;
      }
    }

    // Create a new connection if one doesn't exist
    this.logger.log(`Creating new WebSocket connection for wallet ${normalizedAddress}`);
    const ws = this.connectAndSubscribeToUserFills(normalizedAddress, false, isCopier);

    // Store the WebSocket connection in the map
    this.wsConnections.set(normalizedAddress, ws);

    return true;
  }

  private isLeverageOrder(dir: string) {
    return !['Buy', 'Sell'].includes(dir);
  }

  /**
   * Connect to Hyperliquid WebSocket and subscribe to userFills for a specific address
   * @param walletAddress The wallet address to subscribe to userFills for
   * @param aggregateByTime Optional parameter to aggregate fills by time
   * @param isCopier Whether this wallet belongs to a copier (determines which Kafka topic to use)
   * @returns WebSocket connection object
   */
  connectAndSubscribeToUserFills(walletAddress: string, aggregateByTime = false, isCopier = false): WebSocket {
    this.logger.log(`Connecting to Hyperliquid WebSocket for wallet ${walletAddress}`);

    // Create a new WebSocket connection

    const ws = new WebSocket(isMainnet ? this.HYPERLIQUID_WS_URL : this.HYPERLIQUID_WS_URL_TESTNET);
    let heartbeatInterval: NodeJS.Timeout;

    // Handle connection open
    ws.on('open', () => {
      this.logger.log(`WebSocket connection established for wallet ${walletAddress}`);

      // Create subscription message
      const subscriptionMessage = {
        method: 'subscribe',
        subscription: {
          type: 'userFills',
          user: walletAddress.toLowerCase(),
        },
      };

      // Add optional parameter if provided
      if (aggregateByTime) {
        subscriptionMessage.subscription['aggregateByTime'] = true;
      }

      // Send subscription request
      ws.send(JSON.stringify(subscriptionMessage));
      this.logger.log(`Sent subscription request for wallet ${walletAddress}: ${JSON.stringify(subscriptionMessage)}`);

      // Setup heartbeat to keep connection alive (every 45 seconds to be safe)
      heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const pingMessage = { method: 'ping' };
          ws.send(JSON.stringify(pingMessage));
          this.logger.debug(`Sent heartbeat ping for wallet ${walletAddress}`);
        }
      }, 45000); // 45 seconds interval (server timeout is 60 seconds)
    });

    // Handle incoming messages
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle subscription response
        if (message.channel === 'subscriptionResponse') {
          this.logger.log(`Subscription response for wallet ${walletAddress}: ${JSON.stringify(message.data)}`);
          return;
        }

        // Handle userFills data
        if (message.channel === 'userFills') {
          const fills = message.data.fills;
          this.logger.log(`Received ${fills.length} fills for wallet ${walletAddress}`);

          // Process each fill/order - push directly to Kafka without DB check
          for (const fill of fills) {
            // skip if order is to prepetual
            if (!this.isLeverageOrder(fill.dir)) {
              continue;
            }

            try {
              // Create the message to be sent to Kafka
              const orderMessage = {
                walletAddress: walletAddress,
                order: fill,
                timestamp: new Date().toISOString(),
              };

              // Determine which topic to use based on whether this is a copier or leader
              const kafkaTopic = isCopier
                ? this.kafkaService.topics.copierOrderTopic
                : this.kafkaService.topics.leaderOrderTopic;

              this.logger.debug(
                `Sending order ${fill.hash} to topic ${kafkaTopic} for ${isCopier ? 'copier' : 'leader'} ${walletAddress}`,
              );

              // Send the message to Kafka immediately without DB check
              // The consumer will handle deduplication and DB checks
              this.kafkaService
                .sendMessage(kafkaTopic, orderMessage, walletAddress)
                .then((success) => {
                  if (success) {
                    this.logger.debug(`Successfully pushed order ${fill.hash} to Kafka topic ${kafkaTopic}`);
                  } else {
                    this.logger.error(`Failed to push order ${fill.hash} to Kafka topic ${kafkaTopic}`);
                  }
                })
                .catch((error) => {
                  this.logger.error(
                    `Error sending order ${fill.hash} to Kafka topic ${kafkaTopic}: ${error.message}`,
                    error.stack,
                  );
                });
            } catch (error) {
              this.logger.error(`Error processing order ${fill.hash}: ${error.message}`, error.stack);
            }
          }
          return;
        }

        // Handle pong response from server heartbeat
        if (message.channel === 'pong') {
          this.logger.debug(`Received heartbeat pong for wallet ${walletAddress}`);
          return;
        }

        // Log other messages
        this.logger.debug(`Received message on channel ${message.channel} for wallet ${walletAddress}`);
      } catch (error) {
        this.logger.error(`Error parsing WebSocket message for wallet ${walletAddress}: ${error.message}`, error.stack);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      this.logger.error(`WebSocket error for wallet ${walletAddress}: ${error.message}`, error.stack);
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      this.logger.warn(`WebSocket connection closed for wallet ${walletAddress}: ${code} - ${reason}`);
      // Clear the heartbeat interval when connection closes
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      // Remove from connections map
      this.wsConnections.delete(walletAddress);
    });

    // Extend the WebSocket close method to clean up resources
    const originalClose = ws.close;
    ws.close = function (...args: any[]) {
      // Clear the heartbeat interval when manually closing
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      return originalClose.apply(this, args);
    };

    // Store in connections map
    this.wsConnections.set(walletAddress, ws);
    this.logger.log(
      `Added WebSocket connection for wallet ${walletAddress} to connection manager (total: ${this.wsConnections.size})`,
    );

    // Return the WebSocket instance so the caller can close it if needed
    return ws;
  }

  async getPerpBalanceOfWalletAddress(walletAddress: string): Promise<number> {
    const requestBody = {
      type: 'clearinghouseState',
      user: walletAddress.toLowerCase(),
    };
    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
        requestBody,
      ),
    );

    if (
      response.status === 200 &&
      response.data &&
      response.data.marginSummary &&
      response.data.marginSummary.accountValue
    ) {
      return response.data.marginSummary.accountValue;
    }
    return 0;
  }

  async getPerpStateOfWalletAddress(walletAddress: string) {
    const requestBody = {
      type: 'clearinghouseState',
      user: walletAddress.toLowerCase(),
    };
    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
        requestBody,
      ),
    );

    if (response.status === 200 && response.data) {
      return response.data;
    }
    return 0;
  }

  /**
   * Get all active positions for a wallet address
   * @param walletAddress The wallet address to get positions for
   * @returns An array of active positions with detailed information
   */
  async getUserActivePositions(walletAddress: string): Promise<any[]> {
    try {
      this.logger.log(`Fetching active positions for wallet ${walletAddress}`);

      // Using the imported isMainnet constant
      const requestBody = {
        type: 'clearinghouseState',
        user: walletAddress.toLowerCase(),
      };

      // Call the Hyperliquid API to get the clearinghouse state
      const response = await firstValueFrom(
        this.httpService.post(
          `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
          requestBody,
        ),
      );

      if (response.status === 200 && response.data) {
        const clearinghouseState = response.data;

        // Filter for asset positions (active positions)
        const activePositions = clearinghouseState.assetPositions;

        this.logger.log(`Found ${activePositions.length} active positions for wallet ${walletAddress}`);
        return activePositions;
      }

      this.logger.warn(`Unexpected response from Hyperliquid API: ${JSON.stringify(response.data)}`);
      return [];
    } catch (error) {
      this.logger.error(`Error fetching active positions: ${error.message}`, error.stack);
      return [];
    }
  }

  async getSpotUSDCBalanceOfWalletAddress(walletAddress: string) {
    const requestBody = {
      type: 'spotClearinghouseState',
      user: walletAddress.toLowerCase(),
    };
    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
        requestBody,
      ),
    );

    if (response.status === 200 && response.data && response.data.balances && response.data.balances.length > 0) {
      return response.data.balances.filter((balance: any) => balance.coin === 'USDC')[0].total;
    }
    return 0;
  }

  async getUserBalance(walletAddress: string) {
    const requestBody = {
      type: 'clearinghouseState',
      user: walletAddress.toLowerCase(),
    };
    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
        requestBody,
      ),
    );

    return response.data.marginSummary.totalRawUsd;
  }

  async transferUSDCFromSpotToPerp(fundWalletAddress: string, fundWalletPrivateKey: string, amount: number) {
    const nonce = new Date().getTime();

    const wallet = new ethers.Wallet(fundWalletPrivateKey);

    const payload = {
      type: 'usdClassTransfer',
      amount: amount.toString(),
      toPerp: true,
      nonce: nonce,
      signatureChainId: signatureChainId,
      hyperliquidChain: hyperliquidChain,
    };

    const data = await wallet.signTypedData(
      HyperliquidTransferSpotToPerpDomain,
      HyperliquidTransferSpotToPerpType,
      payload,
    );

    const signature = Signature.from(data);

    const requestBody = {
      action: {
        type: payload.type,
        hyperliquidChain: payload.hyperliquidChain,
        signatureChainId: payload.signatureChainId,
        amount: payload.amount,
        toPerp: payload.toPerp,
        nonce: payload.nonce,
      },
      nonce: payload.nonce,
      signature: {
        r: signature.r,
        s: signature.s,
        v: signature.v,
      },
    };

    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/exchange`,
        requestBody,
      ),
    );

    if (response.status === 200 && response.data && response.data.status == 'ok') {
      return response.data;
    } else {
      this.logger.error(
        `Transfer USDC from Spot to Perp failed. Fund wallet address: ${fundWalletAddress} amount: ${amount}`,
      );
      this.logger.error(response.data);
      throw new Error(
        `Transfer USDC from Spot to Perp failed. Fund wallet address: ${fundWalletAddress} amount: ${amount}`,
      );
    }
  }

  async withdrawUSDCFromPerpToArbitrum(
    walletAddress: string,
    walletPrivateKey: string,
    destination: string,
    amount: number,
    nonce?: number,
  ) {
    this.logger.log(`Withdraw USDC from Perp to Arbitrum. Wallet address: ${walletAddress} amount: ${amount}`);
    this.logger.log(`Destination: ${destination}`);

    const walletBalance = await this.getPerpBalanceOfWalletAddress(walletAddress);

    this.logger.log(`Wallet balance: ${walletBalance}`);
    if (Number(walletBalance) < Number(amount)) {
      throw new BaseException(ERROR.INSUFFICIENT_BALANCE, 400);
    }

    if (!nonce) {
      nonce = new Date().getTime();
    }

    const payload = {
      amount: Number(amount).toFixed(2),
      destination: destination,
      hyperliquidChain: hyperliquidChain,
      signatureChainId: signatureChainId,
      time: nonce,
      type: 'withdraw3',
    };

    const wallet = new ethers.Wallet(walletPrivateKey);

    const data = await wallet.signTypedData(HyperliquidWithdrawDomain, HyperliquidWithdrawType, payload);

    const signature = Signature.from(data);

    const requestBody = {
      action: {
        amount: payload.amount,
        destination: payload.destination,
        hyperliquidChain: payload.hyperliquidChain,
        signatureChainId: payload.signatureChainId,
        time: Number(payload.time),
        type: payload.type,
      },
      nonce: Number(payload.time),
      signature: {
        r: signature.r,
        s: signature.s,
        v: signature.v,
      },
    };

    this.logger.log(JSON.stringify(requestBody));

    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/exchange`,
        requestBody,
      ),
    );

    if (response.status === 200 && response.data && response.data.status == 'ok') {
      this.logger.debug(`Withdraw ${amount} usd from ${walletAddress} to ${destination} successfully initialized`);
      return { ...response.data, nonce };
    } else {
      this.logger.error(`Fail to withdraw ${amount} usd from ${walletAddress} to ${destination}`);
      this.logger.error(response.data);
      throw new Error(`Fail to withdraw ${amount} usd from ${walletAddress} to ${destination}`);
    }
  }

  async getHistoryByUserAddress(userAddress: string, startTime: number, endTime: number) {
    const requestBody = {
      type: 'userNonFundingLedgerUpdates',
      user: userAddress.toLowerCase(),
      startTime,
      endTime,
    };
    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
        requestBody,
      ),
    );
    if (response.status === 200 && Array.isArray(response.data)) {
      this.logger.log(`Fetched ${response.data.length} fills for wallet ${userAddress}`);
      return response.data;
    }
    this.logger.warn(`Unexpected response from Hyperliquid API: ${JSON.stringify(response.data)}`);
    return [];
  }

  /**
   * Transfer USDC from sender to receiver
   * @param fromPublickey sender address
   * @param fromPrivateKey sender priv key
   * @param toPublickey receiver address
   * @param amount amount to send
   * @returns true if success, throw error if failed
   */
  async transferFromTo(fromPublickey: string, fromPrivateKey: string, toPublickey: string, amount: number) {
    const perpBalance = await this.getPerpBalanceOfWalletAddress(fromPublickey);

    if (perpBalance < amount) {
      throw new BaseException(ERROR.INSUFFICIENT_BALANCE, 400);
    }

    const nonce = Math.ceil(new Date().getTime() / 1000) * 1000;

    const wallet = new ethers.Wallet(fromPrivateKey);

    const payload = {
      amount: amount.toString(),
      destination: toPublickey,
      hyperliquidChain: hyperliquidChain,
      signatureChainId: signatureChainId,
      time: nonce,
      type: 'usdSend',
    };

    const data = await wallet.signTypedData(HyperliquidUsdSendDomain, HyperliquidUsdSendType, payload);

    const signature = Signature.from(data);

    const requestBody = {
      action: {
        type: payload.type,
        hyperliquidChain: payload.hyperliquidChain,
        signatureChainId: payload.signatureChainId,
        amount: payload.amount,
        destination: payload.destination,
        time: payload.time,
      },
      nonce: payload.time,
      signature: {
        r: signature.r,
        s: signature.s,
        v: signature.v,
      },
    };

    this.logger.debug(`PerpBalance ${perpBalance}. Transfer ${amount} usd from ${fromPublickey} to ${toPublickey}`);

    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/exchange`,
        requestBody,
      ),
    );

    if (response.status === 200 && response.data && response.data.status == 'ok') {
      return response.data;
    } else {
      this.logger.error(`Fail to transfer ${amount} usd from ${fromPublickey} to ${toPublickey}`);
      this.logger.error(response.data);
      throw new Error(`Fail to transfer ${amount} usd from ${fromPublickey} to ${toPublickey}`);
    }
  }

  async stopAllOpenPositions(fundWalletAddress: string, fundWalletPrivateKey: string) {
    this.logger.log(`Fetching active positions for wallet ${fundWalletAddress}`);

    let positions: any[] = [];
    // Using the imported isMainnet constant
    const requestBody = {
      type: 'clearinghouseState',
      user: fundWalletAddress.toLowerCase(),
    };

    // Call the Hyperliquid API to get the clearinghouse state
    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
        requestBody,
      ),
    );

    if (response.status === 200 && response.data) {
      const clearinghouseState = response.data;

      // Filter for asset positions (active positions)
      positions = clearinghouseState.assetPositions;

      this.logger.log(`Found ${positions.length} active positions for wallet ${fundWalletAddress}`);
    } else {
      this.logger.error(response.data);
      throw new Error('Fail to fetch fund wallet open positions');
    }

    const client = new Hyperliquid({
      privateKey: fundWalletPrivateKey,
      testnet: !isMainnet,
      enableWs: false,
    });

    await client.ensureInitialized();

    const bulkOrder: BulkOrderRequest = {
      orders: [],
    };

    for (const position of positions) {
      // general data, open revert side order to close position
      const isBuy = !(position.position.szi > 0);
      const level = isBuy ? 1 : 0;
      const coin = position.position.coin + '-PERP';
      const size = Math.abs(position.position.szi);

      // fetch L2 book data
      const l2BookData = await client.info.getL2Book(coin);

      // calculate price that have enough size to match order
      let bookSize = 0;
      let price = l2BookData.levels[level][0].px;

      for (const data of l2BookData.levels[level]) {
        bookSize = bookSize + Number(data.sz) * Number(data.n);
        price = data.px;
        if (bookSize > size * 1.5) break;
      }

      const tokenPrepMetadata = await this.getTokenPrepMetadata();
      const tokenPrep = tokenPrepMetadata.universe.find((token) => token.name === coin);

      const fixed = Number(tokenPrep.szDecimals);

      // slippage = 8% to ensure order is filled immediately
      price = (Number(price) * (isBuy ? 1.08 : 0.92)).toFixed(fixed);

      const orderRequest: OrderRequest = {
        coin: coin,
        is_buy: isBuy,
        sz: size,
        limit_px: price,
        reduce_only: false,
        order_type: {
          limit: {
            tif: 'FrontendMarket',
          },
        },
      };

      this.logger.log(
        `Closing position ${coin}, size ${size} side ${isBuy ? 'Buy' : 'Sell'} price ${price} ask/bid ${l2BookData.levels[0][0].px}/${l2BookData.levels[1][0].px}`,
      );
      bulkOrder.orders.push(orderRequest);
    }

    const bulkResult = await client.exchange.placeOrder(bulkOrder);
    this.logger.log(`Closed all open positions for ${fundWalletAddress}`);

    // check if order is not match or rejected
    let count = 0;
    while (true) {
      const userProfile = await this.getPerpStateOfWalletAddress(fundWalletAddress);
      if (userProfile.assetPositions.length == 0) break;

      count++;
      this.logger.log(`User perp asset positions: ${userProfile.assetPositions.length}`);
      this.logger.log(`Sleep 100ms to next check`);

      await sleep(100);

      if (count > 100) {
        throw new BaseException(ERROR.COPY_TRADE_SESSION_NOT_FOUND);
      }
    }

    return positions;
  }

  async stopAllOpenOrders(fundWalletAddress: string, fundWalletPrivateKey: string) {
    const client = new Hyperliquid({
      privateKey: fundWalletPrivateKey,
      testnet: !isMainnet,
      enableWs: false,
    });

    await client.ensureInitialized();

    this.logger.log(`Fetching active orders for wallet ${fundWalletAddress}`);
    const orders = await client.info.getUserOpenOrders(fundWalletAddress);

    this.logger.log(`Found ${orders.length} active orders for wallet ${fundWalletAddress}`);

    for (const order of orders) {
      this.logger.log(`Canceling order ${order.coin} oid ${order.oid} size ${order.sz} side ${order.side}`);
    }

    await client.exchange.cancelOrder(
      orders.map((o) => ({
        coin: o.coin,
        o: o.oid,
      })),
    );

    this.logger.log(`Closed all open orders for ${fundWalletAddress}`);
    return orders;
  }

  async checkStopLoss(amount: number, stopLossTriggerPercentage: number, publicKey: string, privateKey: string) {
    // TODO: check stop on hyperliquid and return true / false for result

    const stoplossAmount = (Number(amount) * Number(stopLossTriggerPercentage)) / 100;

    this.logger.log(`Check stop loss for ${publicKey}`);

    // Using the imported isMainnet constant
    const requestBody = {
      type: 'clearinghouseState',
      user: publicKey.toLowerCase(),
    };

    // Call the Hyperliquid API to get the clearinghouse state
    const response = await firstValueFrom(
      this.httpService.post(
        `${isMainnet ? this.HYPERLIQUID_API_URL : this.HYPERLIQUID_API_URL_TESTNET}/info`,
        requestBody,
      ),
    );

    if (response.status === 200 && response.data) {
      const clearinghouseState = response.data;

      // Filter for asset positions (active positions)
      const activePositions = clearinghouseState.assetPositions;

      const unrealizedPnl = activePositions.reduce((acc: number, position: any) => {
        return acc + Number(position.position.unrealizedPnl);
      }, 0);

      this.logger.log(`Found ${activePositions.length} active positions for wallet ${publicKey}. 
        Unreaized PnL for each: \n${activePositions.map((position: any) => position.position.coin + ': ' + position.position.unrealizedPnl).join('\n')}
        Position amount: ${amount}
        Stop loss trigger percentage: ${stopLossTriggerPercentage}%
        Stop loss amount: ${stoplossAmount}
        Total Unrealized PnL: ${unrealizedPnl}
        `);

      if (unrealizedPnl < -stoplossAmount) {
        return true;
      }

      return false;
    } else {
      this.logger.warn(`Unexpected response from Hyperliquid API: ${JSON.stringify(response.data)}`);
      throw new BaseException(ERROR.UNKNOWN_ERROR);
    }
  }
}
