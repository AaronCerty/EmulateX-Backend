import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ethers } from 'ethers';
import Redis from 'ioredis';
import { copyTradingContractAbi } from 'src/constants/abi/CopyTrading';
import { hyperliquidBridge2ABI } from 'src/constants/abi/HyperliquidBridge2';
import { CopyTradingEventType, HyperliquidBridge2EventType } from 'src/constants/blockchain.constant';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { ERROR } from 'src/constants/exception.constant';
import { BalanceEntity } from 'src/entities/balance.entity';
import { CopierEntity } from 'src/entities/copier.entity';
import { DepositHistoryEntity, DepositHistoryStatus } from 'src/entities/deposit-history.entity';
import { HyperliquidWithdrawEntity } from 'src/entities/hyperliquid-withdraw.entity';
import { LatestBlockEntity } from 'src/entities/latest-block.entity';
import { LockAddressEntity, LockAddressStatus } from 'src/entities/lock-address.entity';
import { UserEntity } from 'src/entities/user.entity';
import { WithdrawHistoryEntity, WithdrawHistoryStatus } from 'src/entities/withdraw-history.entity';
import { BlockchainInteractService } from 'src/modules/blockchain/blockchain-interact.service';
import { KafkaService } from 'src/modules/kafka/kafka.service';
import { BaseException } from 'src/shared/filters/exception.filter';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { divideByDecimal6 } from 'src/shared/utils/bignumber-utils';
import { sendTelegramMessage } from 'src/shared/utils/slack.util';
import { sleep } from 'src/shared/utils/sleep';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import * as web3 from 'web3';

@Injectable()
export class BlockchainCrawlerService {
  private readonly DELAY_TIME = 1000; // testnet: 1000, mainnet: 1000
  private readonly BLOCK_CRAWL = 4000; // testnet: 100, mainnet 5000
  private readonly CONFIRM_BLOCK = 2; // testnet: 12, mainnet: 2

  private readonly logger = new Logger(BlockchainCrawlerService.name);
  private web3Instance: web3.Web3;
  private copyTradingContractAddress: string;
  private hyperliquidBridge2Address: string;
  private copyTradingContract: web3.Contract<web3.ContractAbi>;
  private hyperliquidBridge2Contract: web3.Contract<web3.ContractAbi>;
  private redisInstance: Redis;

  constructor(
    @InjectRepository(LatestBlockEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly latestBlockRepository: Repository<LatestBlockEntity>,
    @InjectRepository(HyperliquidWithdrawEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly hyperliquidWithdrawRepository: Repository<HyperliquidWithdrawEntity>,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly configService: ApiConfigService,
    private readonly redisService: RedisService,
    private readonly kafkaService: KafkaService,
    private readonly blockchainInteractService: BlockchainInteractService,
  ) {
    this.redisInstance = this.redisService.getClient(COMMON_CONSTANT.REDIS_DEFAULT_NAMESPACE);
    // Initialize the crawler process with error handling if in crawler mode
    if (this.configService.isBlockchainCrawlerMode()) {
      this.initializeCrawler1();
      this.initializeCrawler2();
    }
  }

  private async initializeCrawler1() {
    try {
      // Use the centralized WebSocket initialization in HyperliquidService
      await this.initializeCopyTradingContractCrawler();
    } catch (error) {
      // Schedule a retry after a delay instead of failing completely
      this.logger.error(`Failed to initialize blockchain crawler 1: ${error.message}`, error.stack);
      setTimeout(() => {
        this.initializeCrawler1();
      }, 3000); // Retry after 30 seconds
    }
  }

  private async initializeCrawler2() {
    try {
      // Use the centralized WebSocket initialization in HyperliquidService
      await this.initializeHyperliquidBridge2ContractCrawler();
    } catch (error) {
      // Schedule a retry after a delay instead of failing completely
      this.logger.error(`Failed to initialize blockchain crawler 2: ${error.message}`, error.stack);
      setTimeout(() => {
        this.initializeCrawler2();
      }, 3000); // Retry after 30 seconds
    }
  }

  async calculateBlockRange(
    contractAddress: string,
    queryRunner?: QueryRunner,
  ): Promise<{ fromBlock: number; toBlock: number; onchainBlock: number }> {
    let latestBlock;

    const onchainblock = Number((await this.web3Instance.eth.getBlockNumber()).toString());

    if (queryRunner) {
      latestBlock = await queryRunner.manager.findOne(LatestBlockEntity, {
        where: { service: `${BlockchainCrawlerService.name}-${contractAddress}` },
      });
    } else {
      latestBlock = await this.latestBlockRepository.findOne({
        where: { service: `${BlockchainCrawlerService.name}-${contractAddress}` },
      });
    }

    if (!latestBlock) {
      // No latest block found, starting from deploy block
      this.logger.log('No latest block found, starting from deploy block');

      const deployBlock = Number(this.configService.getEnv('COPY_TRADING_CONTRACT_ADDRESS_DEPLOY_BLOCK'));
      await queryRunner.manager.save(LatestBlockEntity, {
        service: `${BlockchainCrawlerService.name}-${contractAddress}`,
        latestBlock: deployBlock,
      });

      const confirmedBlock = onchainblock - this.CONFIRM_BLOCK;
      return {
        fromBlock: deployBlock,
        toBlock: deployBlock + this.BLOCK_CRAWL > confirmedBlock ? confirmedBlock : deployBlock + this.BLOCK_CRAWL,
        onchainBlock: onchainblock,
      };
    } else {
      // Get latest block checkpoint. Confirm that fromBlock always behind latestBlock on chain
      const fromBlock = latestBlock.latestBlock;
      const confirmedBlock = onchainblock - this.CONFIRM_BLOCK;

      if (fromBlock >= confirmedBlock) {
        throw new Error(
          `Not enough confirm blocks to crawl. Wait for next turn. db block: ${fromBlock}, onchain block: ${confirmedBlock} `,
        );
      }

      const toBlock = confirmedBlock - fromBlock < this.BLOCK_CRAWL ? confirmedBlock : fromBlock + this.BLOCK_CRAWL;

      return { fromBlock: fromBlock + 1, toBlock, onchainBlock: onchainblock };
    }
  }
  private async initializeCopyTradingContractCrawler() {
    this.copyTradingContractAddress = this.configService.getEnv('COPY_TRADING_CONTRACT_ADDRESS');
    this.web3Instance = new web3.Web3(this.configService.getEnv('ARBITRUM_RPC_URL'));
    this.copyTradingContract = new this.web3Instance.eth.Contract(
      copyTradingContractAbi,
      this.copyTradingContractAddress,
    );

    while (true) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      const { fromBlock, toBlock, onchainBlock } = await this.calculateBlockRange(
        this.copyTradingContractAddress,
        queryRunner,
      );

      this.logger.debug(
        `From block ${fromBlock} to block ${toBlock}. Onchain block: ${onchainBlock}, delay ${onchainBlock - toBlock} blocks`,
      );

      const result = (await this.copyTradingContract.getPastEvents('allEvents', {
        fromBlock,
        toBlock,
      })) as web3.EventLog[];

      this.logger.debug(`Crawled ${result.length} events of CopyTradingContract.`);

      try {
        await queryRunner.startTransaction();

        // calculate from block and to block, then crawl all events from smart contract

        // if detect any event, process events
        if (result.length > 0) {
          await this.processEventsCopyTradingContract(result, queryRunner);
        }

        // update latest block checkpoint
        await queryRunner.manager.update(
          LatestBlockEntity,
          { service: `${BlockchainCrawlerService.name}-${this.copyTradingContractAddress}` },
          { latestBlock: toBlock },
        );

        await queryRunner.commitTransaction();

        // check if event is FundsDeposited then send to kafka to process transfer to hyperliquid after commit sql transaction
        for (const event of result) {
          if (event.event === CopyTradingEventType.FundsDeposited) {
            await this.kafkaService.sendMessage(this.kafkaService.topics.depositToHyperliquid, {
              depositTransactionHash: event.transactionHash,
            });
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to crawl blocks: ${fromBlock} - ${toBlock} contract ${this.copyTradingContractAddress}`,
        );
        this.logger.error(`Failed to crawl blocks: ${error.message}`, error.stack);

        // Notify to telegram about error of crawler
        if (!error.message.includes('Not enough confirm blocks to crawl')) {
          await sendTelegramMessage(`Blockchain crawler error: @thomas8198
            Contract: CopyTradingContractAddress ${this.copyTradingContractAddress} 
            Error: ${error.message}
            Block: ${fromBlock} - ${toBlock}
            Events: ${result.map((event) => event.event).join(', ')}
            `);
        }

        await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.release();
        await sleep(this.DELAY_TIME);
      }
    }
  }

  async processEventsCopyTradingContract(events: web3.EventLog[], queryRunner: QueryRunner) {
    for (const event of events) {
      switch (event.event) {
        case CopyTradingEventType.FundsDeposited: {
          const depositedAmount = divideByDecimal6(event.returnValues.amount.toString());

          // check exist user. create if not exist
          let user = await queryRunner.manager.findOne(UserEntity, {
            where: { walletAddress: event.returnValues.user.toString().toLowerCase() },
          });

          if (!user) {
            this.logger.warn(`User not found ${event.returnValues.user.toString()}. Create new User`);

            const newUser = new UserEntity();
            newUser.walletAddress = event.returnValues.user.toString().toLowerCase();

            user = await queryRunner.manager.save(newUser);

            // Generate a new wallet for the copier
            const fundWallet = ethers.Wallet.createRandom();

            // Create a new copier linked to the user
            const newCopier = new CopierEntity();
            newCopier.userId = user.id;
            newCopier.totalBalance = 0;
            newCopier.fundWalletAddress = fundWallet.address.toLowerCase();
            newCopier.fundWalletPrivateKey = fundWallet.privateKey;

            await queryRunner.manager.save(newCopier);

            const balanceWallet = ethers.Wallet.createRandom();

            // Create a balance linked to the user
            const newBalance = new BalanceEntity();
            newBalance.depositedBalance = 0;
            newBalance.withdrawnBalance = 0;
            newBalance.userId = user.id;
            newBalance.balanceWalletAddress = balanceWallet.address.toLowerCase();
            newBalance.balanceWalletPrivateKey = balanceWallet.privateKey;

            await queryRunner.manager.save(newBalance);
          }

          // check exist balance. create if not exist
          let balance = await queryRunner.manager.findOne(BalanceEntity, {
            where: { userId: user.id },
          });

          if (!balance) {
            this.logger.warn(`Balance not found for user ${user.id}. Create new Balance`);
            // Create a balance linked to the user

            const balanceWallet = ethers.Wallet.createRandom();

            const newBalance = new BalanceEntity();
            newBalance.depositedBalance = 0;
            newBalance.withdrawnBalance = 0;
            newBalance.userId = user.id;
            newBalance.balanceWalletAddress = balanceWallet.address.toLowerCase();
            newBalance.balanceWalletPrivateKey = balanceWallet.privateKey;

            await queryRunner.manager.save(newBalance);
          }

          await queryRunner.manager.query(`
              UPDATE balance
              SET deposited_balance = deposited_balance + ${depositedAmount}
              WHERE user_id = '${user.id}'
            `);

          const blocktimeStamp = (await this.web3Instance.eth.getBlock(event.blockNumber)).timestamp;

          // save deposit history
          const newDepositHistory = new DepositHistoryEntity();
          newDepositHistory.walletAddress = event.returnValues.user.toString().toLowerCase();
          newDepositHistory.amount = depositedAmount;
          newDepositHistory.token = event.returnValues.token.toString().toLowerCase();
          newDepositHistory.txHash = event.transactionHash;
          newDepositHistory.blockNumber = Number(event.blockNumber);
          newDepositHistory.createdAt = new Date(Number(blocktimeStamp) * 1000);
          newDepositHistory.status = DepositHistoryStatus.DEPOSITED_BLOCKCHAIN;

          await queryRunner.manager.save(DepositHistoryEntity, newDepositHistory);

          this.logger.log(
            `Deposited: ${depositedAmount} - BigNumber ${event.returnValues.amount.toString()}. 
            Token ${event.returnValues.token.toString()}. 
            User ${event.returnValues.user.toString()}. 
            TxHash ${event.transactionHash}`,
          );

          break;
        }

        case CopyTradingEventType.FundsWithdrawn: {
          this.logger.log(`TODO: not implemented`);
          break;
        }
        case CopyTradingEventType.FeePercentageUpdated: {
          await this.redisInstance.set('fee_percentage', Number(event.returnValues.newFee) / 10000);
          break;
        }
        case CopyTradingEventType.FundsTransferredToWallet: {
          this.logger.log(`TODO: not implemented`);

          break;
        }
        default: {
          this.logger.warn(`Unknown event type: ${event.event}`);
          break;
        }
      }
    }
  }

  private async initializeHyperliquidBridge2ContractCrawler() {
    this.hyperliquidBridge2Address = this.configService.getEnv('HYPERLIQUID_BRIDGE_ADDRESS');
    this.web3Instance = new web3.Web3(this.configService.getEnv('ARBITRUM_RPC_URL'));
    this.hyperliquidBridge2Contract = new this.web3Instance.eth.Contract(
      hyperliquidBridge2ABI,
      this.hyperliquidBridge2Address,
    );

    while (true) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // calculate from block and to block, then crawl all events from smart contract
      const { fromBlock, toBlock, onchainBlock } = await this.calculateBlockRange(
        this.hyperliquidBridge2Address,
        queryRunner,
      );

      this.logger.debug('params');
      this.logger.log({
        fromBlock,
        toBlock,
      });

      const result = (await this.hyperliquidBridge2Contract.getPastEvents('allEvents', {
        fromBlock,
        toBlock,
      })) as web3.EventLog[];
      this.logger.debug(
        `Crawled ${result.length} events of HyperliquidBridge2Contract. From block ${fromBlock} to block ${toBlock}. Onchain block: ${onchainBlock}, delay ${onchainBlock - toBlock} blocks`,
      );

      try {
        // if detect any event, process events
        if (result.length > 0) {
          await this.processEventsHyperliquidBridge2Contract(result, queryRunner);
        }

        // update latest block checkpoint
        await queryRunner.manager.update(
          LatestBlockEntity,
          { service: `${BlockchainCrawlerService.name}-${this.hyperliquidBridge2Address}` },
          { latestBlock: toBlock },
        );

        await queryRunner.commitTransaction();
      } catch (error) {
        this.logger.error(
          `Failed to crawl blocks: ${fromBlock} - ${toBlock} contract ${this.hyperliquidBridge2Address}`,
        );
        this.logger.error(`Failed to crawl blocks: ${error.message}`, error.stack);
        // Notify to telegram about error of crawler
        if (!error.message.includes('Not enough confirm blocks to crawl')) {
          await sendTelegramMessage(`Blockchain crawler error: @thomas8198
            Contract: HyperliquidBridge2Address ${this.hyperliquidBridge2Address}
            Error: ${error.message}
            `);
        }
        await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.release();
        await sleep(this.DELAY_TIME);
      }
    }
  }

  private async processEventsHyperliquidBridge2Contract(events: web3.EventLog[], queryRunner: QueryRunner) {
    for (const event of events) {
      switch (event.event) {
        case HyperliquidBridge2EventType.FinalizedWithdrawal: {
          if (event.returnValues.destination !== this.blockchainInteractService.getCopyTradingContractAddress()) {
            // this.logger.warn(`Not copy trade contract events, skip!`);
            break;
          }

          this.logger.debug(`TxHash: ${event.transactionHash}
            User: ${event.returnValues.user}
            Destination: ${event.returnValues.destination}
            USD: ${event.returnValues.usd}
            Nonce: ${event.returnValues.nonce}
            Message: ${event.returnValues.message}
            `);

          const balance = await queryRunner.manager.findOne(BalanceEntity, {
            where: {
              balanceWalletAddress: event.returnValues.user.toString().toLowerCase(),
            },
          });

          if (!balance) {
            this.logger.warn(`Balance not found for balance wallet ${event.returnValues.user}`);
            break;
          }

          const user = await queryRunner.manager.findOne(UserEntity, {
            where: {
              id: balance.userId,
            },
          });

          if (!user) {
            this.logger.warn(`User not found for wallet address ${event.returnValues.user}`);
            break;
          }

          const copier = await queryRunner.manager.findOne(CopierEntity, {
            where: {
              userId: user.id,
            },
          });

          if (!copier) {
            this.logger.warn(`Copier not found for user ${user.id}`);
            break;
          }

          const withdrawHistory = await queryRunner.manager.findOne(WithdrawHistoryEntity, {
            where: {
              nonce: Math.floor(Number(event.returnValues.nonce) / 1000),
              status: WithdrawHistoryStatus.PENDING_BLOCKCHAIN,
            },
          });

          if (!withdrawHistory) {
            this.logger.warn(`Withdraw history not found for nonce ${event.returnValues.nonce}`);
            break;
          }

          this.logger.debug(`
            Withdraw history found for nonce ${event.returnValues.nonce}
            Withdraw history id ${withdrawHistory.id}
            Balance wallet address ${balance.balanceWalletAddress}
            Amount ${event.returnValues.usd}
            Start transfer from Smart contract to user
            `);

          const lockAddress = await queryRunner.manager.findOne(LockAddressEntity, {
            where: {
              address: this.blockchainInteractService.getAdminWalletAddress(),
              status: LockAddressStatus.AVAILABLE,
            },
          });

          if (!lockAddress) {
            this.logger.warn(
              `Lock address not found for admin wallet ${this.blockchainInteractService.getAdminWalletAddress()}`,
            );
            throw new BaseException(ERROR.LOCK_ADDRESS_ADMIN_IS_UNAVAILABLE, 400);
          }

          lockAddress.status = LockAddressStatus.UNAVAILABLE;
          await queryRunner.manager.save(LockAddressEntity, lockAddress);

          const receipt = await this.blockchainInteractService.requestWithdrawalUSDC(
            user.walletAddress,
            event.returnValues.usd.toString(),
          );

          lockAddress.status = LockAddressStatus.AVAILABLE;
          await queryRunner.manager.save(LockAddressEntity, lockAddress);

          this.logger.debug(receipt.events);

          withdrawHistory.status = WithdrawHistoryStatus.DONE;
          withdrawHistory.txHash = receipt.transactionHash;
          withdrawHistory.blockNumber = Number(receipt.blockNumber);
          withdrawHistory.fee = Number(divideByDecimal6(Number(receipt.events.FundsWithdrawn.returnValues.fee))) + 1;

          balance.withdrawnBalance =
            Number(balance.withdrawnBalance) + Number(divideByDecimal6(Number(event.returnValues.usd)));

          const hyperliquidWithdraw = new HyperliquidWithdrawEntity();
          hyperliquidWithdraw.balanceWalletAddress = balance.balanceWalletAddress;
          hyperliquidWithdraw.fundWalletAddress = copier.fundWalletAddress;
          hyperliquidWithdraw.amount = Number(event.returnValues.usd);
          hyperliquidWithdraw.txHash = event.transactionHash;

          await queryRunner.manager.save(WithdrawHistoryEntity, withdrawHistory);
          await queryRunner.manager.save(BalanceEntity, balance);
          await queryRunner.manager.save(HyperliquidWithdrawEntity, hyperliquidWithdraw);

          this.logger.debug(
            `Finish withdrawal fund for ${user.id}. 
              TxHash ${receipt.transactionHash}
              Amount ${event.returnValues.usd}
              User wallet address ${user.walletAddress}`,
          );
          break;
        }

        default: {
          break;
        }
      }
    }
  }
}
