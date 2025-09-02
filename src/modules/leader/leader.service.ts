import { COMMON_CONSTANT } from '../../constants/common.constant';
import { ERROR } from '../../constants/exception.constant';
import { LeaderType } from '../../constants/leader.constant';
import { HyperliquidService } from '../hyperliquid/hyperliquid.service';
import { CreateLeaderRequestDto } from './dto/create-leader-request.dto';
import { CreateLeaderResponseDto } from './dto/create-leader-response.dto';
import { GetLeaderDetailRequestDto } from './dto/get-leader-detail-request.dto';
import { GetLeaderDetailResponseDto } from './dto/get-leader-detail-response.dto';
import { GetLeaderTradingPairsRequestDto } from './dto/get-leader-trading-pairs-request.dto';
import { GetLeaderTradingPairsResponseDto, TradingPairDto } from './dto/get-leader-trading-pairs-response.dto';
import { GetLeaderTransactionsRequestDto } from './dto/get-leader-transactions-request.dto';
import { GetLeaderTransactionsResponseDto, TransactionItemDto } from './dto/get-leader-transactions-response.dto';
import { GetLeadersRequestDto } from './dto/get-leaders-request.dto';
import { GetLeadersResponseDto, LeaderDto } from './dto/get-leaders-response.dto';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LeaderEntity } from 'src/entities/leader.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { UserEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LeaderService {
  private readonly logger = new Logger(LeaderService.name);
  constructor(
    @InjectRepository(LeaderEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly leaderRepository: Repository<LeaderEntity>,
    @InjectRepository(TransactionEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly hyperliquidService: HyperliquidService,
  ) {}

  async getLeaders(query: GetLeadersRequestDto): Promise<GetLeadersResponseDto> {
    const {
      page = 1,
      limit = 10,
      timeRange,
      type,
      minPnl,
      maxPnl,
      minRoi,
      maxRoi,
      minWinRate,
      maxWinRate,
      minAum,
      maxAum,
      riskLevel,
    } = query;

    const skip = (page - 1) * limit;

    // Build query
    let qb = this.leaderRepository.createQueryBuilder('leader');

    // Apply filters
    if (type && type !== LeaderType.ALL) {
      qb = qb.andWhere('leader.leader_type = :type', { type });
    }

    if (riskLevel) {
      qb = qb.andWhere('leader.risk_level = :riskLevel', { riskLevel });
    }

    // Get field names based on selected time range
    const timeRangeSuffix = timeRange.replace('d', '');
    const pnlField = `pnl${timeRangeSuffix}d`;
    const roiField = `roi${timeRangeSuffix}d`;
    const winRateField = `winRate${timeRangeSuffix}d`;
    const aumField = `aum${timeRangeSuffix}d`;

    // Apply PNL filters
    if (minPnl !== undefined) {
      qb = qb.andWhere(`leader.${pnlField} >= :minPnl`, { minPnl });
    }

    if (maxPnl !== undefined) {
      qb = qb.andWhere(`leader.${pnlField} <= :maxPnl`, { maxPnl });
    }

    // Apply ROI filters
    if (minRoi !== undefined) {
      qb = qb.andWhere(`leader.${roiField} >= :minRoi`, { minRoi });
    }

    if (maxRoi !== undefined) {
      qb = qb.andWhere(`leader.${roiField} <= :maxRoi`, { maxRoi });
    }

    // Apply Win Rate filters
    if (minWinRate !== undefined) {
      qb = qb.andWhere(`leader.${winRateField} >= :minWinRate`, { minWinRate });
    }

    if (maxWinRate !== undefined) {
      qb = qb.andWhere(`leader.${winRateField} <= :maxWinRate`, { maxWinRate });
    }

    // Apply AUM filters
    if (minAum !== undefined) {
      qb = qb.andWhere(`leader.${aumField} >= :minAum`, { minAum });
    }

    if (maxAum !== undefined) {
      qb = qb.andWhere(`leader.${aumField} <= :maxAum`, { maxAum });
    }

    // Order by PNL for the selected time range
    const orderByField = `leader.${pnlField}`;
    qb = qb.orderBy(orderByField, 'DESC');

    // Get total count
    const total = await qb.getCount();

    // Apply pagination
    qb = qb.skip(skip).take(limit);

    // Get leaders
    const leaders = await qb.getMany();

    // Convert to DTOs
    const items = leaders.map((leader) => {
      const dto = new LeaderDto();
      Object.assign(dto, leader);
      return dto;
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get leader details by ID
  async getLeaderDetail(query: GetLeaderDetailRequestDto): Promise<GetLeaderDetailResponseDto> {
    const { leaderId } = query;

    // Find the leader by ID
    const leader = await this.leaderRepository.findOne({ where: { id: leaderId } });

    if (!leader) {
      throw new NotFoundException({
        message: `${ERROR.LEADER_NOT_FOUND.message}: ${leaderId}`,
        code: ERROR.LEADER_NOT_FOUND.code,
      });
    }

    // Convert to DTO
    const leaderDetailDto = new GetLeaderDetailResponseDto();
    Object.assign(leaderDetailDto, leader);

    return leaderDetailDto;
  }

  // Get transactions for a leader with pagination and filtering
  async getLeaderTransactions(query: GetLeaderTransactionsRequestDto): Promise<GetLeaderTransactionsResponseDto> {
    const { leaderId, page, limit, type } = query;

    // Create query builder to fetch transactions
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.leader_id = :leaderId', { leaderId });

    // Apply transaction type filter if not 'ALL'
    if (type !== 'ALL') {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination and sorting
    // Cast timestampMs to BIGINT for proper numeric sorting
    const transactions = await queryBuilder
      .orderBy('CAST(transaction.timestamp_ms AS BIGINT)', 'DESC', 'NULLS LAST')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Map to DTO
    const transactionItems: TransactionItemDto[] = transactions.map((transaction) => ({
      id: transaction.id,
      chainId: transaction.chainId,
      base: transaction.base,
      quote: transaction.quote,
      amount: Number(transaction.amount),
      price: Number(transaction.price),
      totalValue: Number(transaction.totalValue),
      direction: transaction.direction,
      type: transaction.type,
      status: transaction.status,
      transactionHash: transaction.transactionHash,
      timestampMs: transaction.timestampMs,
      errorMessage: transaction.errorMessage,
      // Convert createdAt to Date to match the DTO type
      createdAt: new Date(transaction.createdAt),
      metadata: JSON.parse(transaction.metadata),
    }));

    return {
      leaderId,
      transactions: transactionItems,
      total,
      page,
      limit,
    };
  }

  /**
   * Get current positions for a leader
   * @param leaderId ID of the leader
   * @returns Current positions from Hyperliquid
   */
  /**
   * Helper method to find a leader's wallet address
   * @param leaderId ID of the leader
   * @returns The wallet address associated with the leader
   */
  private async findLeaderWalletAddress(leaderId: string): Promise<string | null> {
    try {
      // First get the leader to find its userId
      const leader = await this.leaderRepository.findOne({ where: { id: leaderId } });
      if (!leader) return null;

      // Get the user with that ID to get their wallet address
      const user = await this.leaderRepository.manager.findOne(UserEntity, { where: { id: leader.userId } });
      if (!user) return null;

      return user.walletAddress.toLowerCase();
    } catch (error) {
      this.logger.error(`Error finding wallet address for leader ${leaderId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get current positions for a leader
   * @param leaderId ID of the leader
   * @returns Current positions from Hyperliquid
   */
  async getLeaderPositions(leaderId: string) {
    // Verify leader exists and get wallet address
    const leader = await this.leaderRepository.findOne({ where: { id: leaderId } });
    if (!leader) {
      throw new NotFoundException({
        message: `${ERROR.LEADER_NOT_FOUND.message}: ${leaderId}`,
        code: ERROR.LEADER_NOT_FOUND.code,
      });
    }

    // Find the user associated with this leader to get their wallet address
    const walletAddress = await this.findLeaderWalletAddress(leaderId);
    if (!walletAddress) {
      throw new Error(`Could not find wallet address for leader ${leaderId}`);
    }

    // Get positions from Hyperliquid service
    return this.hyperliquidService.getUserActivePositions(walletAddress);
  }

  /**
   * Get the most traded pairs for a leader
   * @param query The query parameters including leaderId and optional limit
   * @returns Trading pairs statistics including percentage and PnL
   */
  async getLeaderTradingPairs(query: GetLeaderTradingPairsRequestDto): Promise<GetLeaderTradingPairsResponseDto> {
    const { leaderId, limit = 3 } = query;

    // Verify leader exists
    const leader = await this.leaderRepository.findOne({ where: { id: leaderId } });
    if (!leader) {
      throw new NotFoundException({
        message: `${ERROR.LEADER_NOT_FOUND.message}: ${leaderId}`,
        code: ERROR.LEADER_NOT_FOUND.code,
      });
    }

    // Get all transactions for this leader
    const transactions = await this.transactionRepository.find({
      where: { leaderId },
      select: ['base', 'quote', 'totalValue', 'closedPnl', 'status'],
    });

    this.logger.log(`Found ${transactions.length} transactions for leader ${leaderId}`);

    // Group transactions by trading pair
    const pairStats = new Map<string, { count: number; totalValue: number; totalPnl: number }>();
    let overallTotalValue = 0;
    let overallTotalPnl = 0;

    for (const tx of transactions) {
      if (tx.status !== 'COMPLETED') continue;

      const pair = `${tx.base}/${tx.quote}`;
      const totalValue = Number(tx.totalValue) || 0;
      const pnl = Number(tx.closedPnl) || 0;

      overallTotalValue += totalValue;
      overallTotalPnl += pnl;

      if (!pairStats.has(pair)) {
        pairStats.set(pair, { count: 0, totalValue: 0, totalPnl: 0 });
      }

      const stats = pairStats.get(pair);
      stats.count += 1;
      stats.totalValue += totalValue;
      stats.totalPnl += pnl;
    }

    // Convert to array and sort by total value
    const sortedPairs = [...pairStats.entries()]
      .map(([pair, stats]) => {
        const [base, quote] = pair.split('/');
        return {
          pair,
          base,
          quote,
          count: stats.count,
          totalValue: stats.totalValue,
          totalPnl: stats.totalPnl,
          percentage: Math.round((stats.totalValue / overallTotalValue) * 100) || 0,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);

    // Take the top N pairs based on limit
    const topPairs = sortedPairs.slice(0, limit);

    // Calculate "Other" category if there are more pairs than the limit
    let otherPercentage = 0;
    let otherPnl = 0;

    if (sortedPairs.length > limit) {
      const otherPairs = sortedPairs.slice(limit);
      otherPercentage =
        Math.round((otherPairs.reduce((sum, pair) => sum + pair.totalValue, 0) / overallTotalValue) * 100) || 0;
      otherPnl = otherPairs.reduce((sum, pair) => sum + pair.totalPnl, 0);

      // Add "Other" to the list
      topPairs.push({
        pair: 'Other',
        base: 'Other',
        quote: '',
        count: otherPairs.reduce((sum, pair) => sum + pair.count, 0),
        totalValue: otherPairs.reduce((sum, pair) => sum + pair.totalValue, 0),
        totalPnl: otherPnl,
        percentage: otherPercentage,
      });
    }

    // Format response
    const tradingPairsDto: TradingPairDto[] = topPairs.map((pair) => ({
      pair: pair.pair,
      base: pair.base,
      quote: pair.quote,
      percentage: pair.percentage,
      pnl: pair.totalPnl,
    }));

    return {
      leaderId,
      tradingPairs: tradingPairsDto,
      totalPnl: Number(overallTotalPnl.toFixed(2)),
    };
  }

  /**
   * Create a new leader with associated user
   * @param data Leader creation data
   * @returns Created leader information
   */
  async createLeader(data: CreateLeaderRequestDto): Promise<CreateLeaderResponseDto> {
    this.logger.log(`Creating new leader with wallet address: ${data.walletAddress}`);

    // Check if user with this wallet address already exists
    const existingUser = await this.leaderRepository.manager.findOne(UserEntity, {
      where: { walletAddress: data.walletAddress },
    });

    let user: UserEntity;
    let userId: string;

    // Transaction to ensure both user and leader are created together
    return this.leaderRepository.manager.transaction(async (transactionalEntityManager) => {
      // Create or use existing user
      if (existingUser) {
        this.logger.log(`User with wallet address ${data.walletAddress} already exists, using existing user`);
        user = existingUser;
        userId = existingUser.id;

        // Check if this user is already a leader
        const existingLeader = await transactionalEntityManager.findOne(LeaderEntity, {
          where: { userId: userId },
        });

        if (existingLeader) {
          throw new ConflictException({
            message: `User with wallet address ${data.walletAddress} is already a leader`,
            code: 'LEADER_ALREADY_EXISTS',
          });
        }
      } else {
        // Create new user
        this.logger.log(`Creating new user with wallet address: ${data.walletAddress}`);

        const newUser = new UserEntity();
        newUser.walletAddress = data.walletAddress;
        newUser.username = data.username || null;

        user = await transactionalEntityManager.save(newUser);
        userId = user.id;
      }

      // Create leader
      const leader = new LeaderEntity();
      leader.userId = userId;
      leader.name = data.name;
      leader.avt = data.avt || null;
      leader.imageUrl = data.imageUrl || null;
      leader.description = data.description || null;
      leader.telegramUrl = data.telegramUrl || null;
      leader.xUrl = data.xUrl || null;
      leader.riskLevel = data.riskLevel || null;
      leader.leaderType = data.leaderType || LeaderType.TRADER;
      leader.startTradeTime = data.startTradeTime ? new Date(data.startTradeTime) : null;
      leader.historySynced = false;

      const savedLeader = await transactionalEntityManager.save(leader);

      // Initialize WebSocket connections if needed
      try {
        await this.hyperliquidService.ensureUserFillsSubscription(data.walletAddress, false);
        this.logger.log(`Initialized WebSocket connections for leader with wallet address: ${data.walletAddress}`);
      } catch (error) {
        this.logger.error(`Failed to initialize WebSocket connections: ${error.message}`);
        // Continue even if WebSocket initialization fails
        // We don't want to rollback the transaction because of this
      }

      // Prepare and return the response
      const response = new CreateLeaderResponseDto();
      response.id = savedLeader.id;
      response.userId = savedLeader.userId;
      response.walletAddress = user.walletAddress;
      response.name = savedLeader.name;
      response.avt = savedLeader.avt;
      response.imageUrl = savedLeader.imageUrl;
      response.description = savedLeader.description;
      response.telegramUrl = savedLeader.telegramUrl;
      response.xUrl = savedLeader.xUrl;
      response.riskLevel = savedLeader.riskLevel;
      response.leaderType = savedLeader.leaderType;
      response.startTradeTime = savedLeader.startTradeTime;
      response.historySynced = savedLeader.historySynced;
      response.createdAt = savedLeader.createdAt;

      return response;
    });
  }
}
