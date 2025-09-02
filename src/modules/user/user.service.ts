import { GetMyUserResponseDto } from './dto/get-my-user-response.dto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { AllocationType } from 'src/constants/allocation.constant';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { ERROR } from 'src/constants/exception.constant';
import { BalanceEntity } from 'src/entities/balance.entity';
import { CopierEntity } from 'src/entities/copier.entity';
import { CopyTradeSessionEntity, CopyTradeSessionStatus } from 'src/entities/copy-trade-session.entity';
import { DepositHistoryEntity } from 'src/entities/deposit-history.entity';
import { LeaderEntity } from 'src/entities/leader.entity';
import { UserEntity } from 'src/entities/user.entity';
import { WithdrawHistoryEntity, WithdrawHistoryStatus } from 'src/entities/withdraw-history.entity';
import { BlockchainInteractService } from 'src/modules/blockchain/blockchain-interact.service';
import { HyperliquidService } from 'src/modules/hyperliquid/hyperliquid.service';
import { KafkaService } from 'src/modules/kafka/kafka.service';
import { GetHistoryDto } from 'src/modules/user/dto/get-deposited-history.dto';
import { RequestWithdrawDto } from 'src/modules/user/dto/request-withdraw.dto';
import { StartCopyTradeDto } from 'src/modules/user/dto/start-copy-trade.dto';
import { StopCopyTradeDto } from 'src/modules/user/dto/stop-copy-trade.dto';
import { JwtPayload } from 'src/shared/dto/jwt-payload.dto';
import { BaseException } from 'src/shared/filters/exception.filter';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(DepositHistoryEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly depositHistoryRepository: Repository<DepositHistoryEntity>,
    @InjectRepository(CopierEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly copierRepository: Repository<CopierEntity>,
    @InjectRepository(BalanceEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly balanceRepository: Repository<BalanceEntity>,
    @InjectRepository(UserEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WithdrawHistoryEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly withdrawHistoryRepository: Repository<WithdrawHistoryEntity>,
    private readonly kafkaService: KafkaService,
    private readonly hyperliquidService: HyperliquidService,
    private readonly blockchainInteractService: BlockchainInteractService,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT) private readonly dataSource: DataSource,
    private readonly configService: ApiConfigService,
  ) {}

  async getHistory(userId: string, query: GetHistoryDto) {
    if (query.type) {
      if (query.type == 'deposit') {
        const depositedHistory = await this.getDepositedHistory(userId, query);
        const result = [
          ...depositedHistory.depositHistory.map((e) => {
            return {
              id: e.id,
              amount: e.amount,
              type: 'deposit',
              status: e.status,
              blockNumber: e.blockNumber,
              txHash: e.txHash,
              createdAt: e.createdAt,
              updatedAt: e.updatedAt,
            };
          }),
        ]
          .sort((a, b) => {
            return b.createdAt.getTime() - a.createdAt.getTime();
          })
          .slice(0, query.limit);
        return {
          history: result,
          total: depositedHistory.total,
          page: depositedHistory.page,
          limit: depositedHistory.limit,
          totalPages: depositedHistory.totalPages,
        };
      } else if (query.type == 'withdraw') {
        const withdrawHistory = await this.getWithdrawHistory(userId, query);
        const result = [
          ...withdrawHistory.withdrawHistory.map((e) => {
            return {
              id: e.id,
              amount: e.amount,
              type: 'withdraw',
              status: e.status,
              blockNumber: e.blockNumber,
              txHash: e.txHash,
              createdAt: e.createdAt,
              updatedAt: e.updatedAt,
            };
          }),
        ].sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        return {
          history: result,
          total: withdrawHistory.total,
          page: withdrawHistory.page,
          limit: withdrawHistory.limit,
          totalPages: withdrawHistory.totalPages,
        };
      } else {
        throw new BaseException('Wrong format of type');
      }
    } else {
      const depositedHistory = await this.getDepositedHistory(userId, query);
      const withdrawHistory = await this.getWithdrawHistory(userId, query);
      const result = [
        ...depositedHistory.depositHistory.map((e) => {
          return {
            id: e.id,
            amount: e.amount,
            type: 'deposit',
            status: e.status,
            blockNumber: e.blockNumber,
            txHash: e.txHash,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          };
        }),
        ...withdrawHistory.withdrawHistory.map((e) => {
          return {
            id: e.id,
            amount: e.amount,
            type: 'withdraw',
            status: e.status,
            blockNumber: e.blockNumber,
            txHash: e.txHash,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          };
        }),
      ].sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      return {
        history: result,
        total: depositedHistory.total + withdrawHistory.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil((depositedHistory.total + withdrawHistory.total) / query.limit),
      };
    }
  }

  async getDepositedHistory(userId: string, query: GetHistoryDto) {
    const { page = 1, limit = 10 } = query;

    const skip = (page - 1) * limit;

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) throw new BaseException('User not found', 400);

    const total = await this.depositHistoryRepository.count({
      where: {
        walletAddress: user.walletAddress,
      },
    });

    const depositHistory = await this.depositHistoryRepository.find({
      where: {
        walletAddress: user.walletAddress,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip,
    });

    return {
      depositHistory,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWithdrawHistory(userId: string, query: GetHistoryDto) {
    const { page = 1, limit = 10 } = query;

    const skip = (page - 1) * limit;

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) throw new BaseException('User not found', 400);

    const total = await this.withdrawHistoryRepository.count({
      where: {
        userId: user.id,
      },
    });

    const withdrawHistory = await this.withdrawHistoryRepository.find({
      where: {
        userId: user.id,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip,
    });

    return {
      withdrawHistory,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBalance(userId: string) {
    const balance = await this.balanceRepository.findOne({ where: { userId: userId } });
    if (!balance) {
      const newBalance = new BalanceEntity();
      newBalance.userId = userId;
      newBalance.depositedBalance = 0;
      newBalance.withdrawnBalance = 0;
      return this.balanceRepository.save(newBalance);
    }

    const copier = await this.copierRepository.findOne({
      where: {
        userId: userId,
      },
    });

    const copierPerpBalance = await this.hyperliquidService.getPerpBalanceOfWalletAddress(copier.fundWalletAddress);

    return {
      availableBalance: balance.availableBalance,
      withdrawableBalance: balance.withdrawnBalance,
      totalBalance: Number(copierPerpBalance) + Number(balance.availableBalance),
    };
  }

  async startCopyTrade(body: StartCopyTradeDto, userId: string) {
    if (!body.confirmSharing) {
      throw new BaseException(ERROR.COPY_TRADE_NOT_CONFIRM_SHARING, 400);
    }
    if (!body.agreeServiceTerms) {
      throw new BaseException(ERROR.COPY_TRADE_NOT_AGREE_SERVICE_TERMS, 400);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const copier = await queryRunner.manager.findOne(CopierEntity, { where: { userId: userId } });
      if (!copier) throw new BaseException(ERROR.COPY_TRADE_COPIER_NOT_FOUND, 400);

      const balance = await queryRunner.manager.findOne(BalanceEntity, {
        where: {
          userId,
        },
      });

      if (!balance) throw new BaseException(ERROR.BALANCE_NOT_FOUND, 400);

      if (balance.availableBalance < body.copyAmount) throw new BaseException(ERROR.INSUFFICIENT_BALANCE, 400);

      const currentCopyTradeSession = await queryRunner.manager.exists(CopyTradeSessionEntity, {
        where: [
          {
            copierId: copier.id,
            isActive: true,
          },
          {
            copierId: copier.id,
            status: CopyTradeSessionStatus.CREATING,
          },
          {
            copierId: copier.id,
            status: CopyTradeSessionStatus.RUNNING,
          },
        ],
      });

      if (currentCopyTradeSession) throw new BaseException(ERROR.COPY_TRADE_SESSION_ALREADY_EXISTS, 400);

      const leader = await queryRunner.manager.findOne(LeaderEntity, { where: { id: body.leaderId } });
      if (!leader) throw new BaseException(ERROR.LEADER_NOT_FOUND, 400);

      // Increment the leader's follower count
      leader.followersCount = Number(leader.followersCount) + 1;
      await queryRunner.manager.save(leader);

      await this.hyperliquidService.transferFromTo(
        balance.balanceWalletAddress,
        balance.balanceWalletPrivateKey,
        copier.fundWalletAddress,
        body.copyAmount,
      );

      const copyTradeSession = new CopyTradeSessionEntity();
      copyTradeSession.amount = body.copyAmount;
      copyTradeSession.isActive = true;
      copyTradeSession.copierId = copier.id;
      copyTradeSession.startCopyTradeAt = new Date();
      copyTradeSession.leaderId = body.leaderId;
      copyTradeSession.status = CopyTradeSessionStatus.RUNNING;
      copyTradeSession.confirmSharing = body.confirmSharing;
      copyTradeSession.agreeServiceTerms = body.agreeServiceTerms;
      if (body.allocationType === AllocationType.FIXED_AMOUNT) {
        copyTradeSession.fixedAmountPerTrade = body.amountPerCopyTrade;
      } else {
        const leaderUserData = await this.userRepository.findOne({
          where: {
            id: leader.userId,
          },
        });

        if (!leaderUserData) {
          throw new BaseException(ERROR.LEADER_NOT_FOUND, 400);
        }

        const leaderBalance = await this.hyperliquidService.getUserBalance(leaderUserData.walletAddress);
        copyTradeSession.scaleFactor = Math.min(
          Number((Number(body.copyAmount) / Number(leaderBalance)).toFixed(2)),
          1,
        );
      }

      copyTradeSession.slippage = 1;

      const result = await queryRunner.manager.save(copyTradeSession);

      await queryRunner.manager.query(`
        UPDATE balance
        SET available_balance = available_balance - ${body.copyAmount}
        WHERE id = '${balance.id}'
    `);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.logger.error(error);
      this.logger.error(error.stack);
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(ERROR.UNKNOWN_ERROR);
    }
  }

  async stopCopyTrade(body: StopCopyTradeDto, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const copyTradeSession = await queryRunner.manager.findOne(CopyTradeSessionEntity, {
        where: {
          id: body.copyTradeSessionId,
        },
      });

      if (!copyTradeSession) throw new BaseException(ERROR.COPY_TRADE_SESSION_NOT_FOUND, 400);

      if (copyTradeSession.status == CopyTradeSessionStatus.RUNNING) {
        const copier = await queryRunner.manager.findOne(CopierEntity, {
          where: {
            id: copyTradeSession.copierId,
          },
        });

        if (!copier) throw new BaseException(ERROR.COPY_TRADE_COPIER_NOT_FOUND, 400);

        // Get the leader and decrement follower count
        const leader = await queryRunner.manager.findOne(LeaderEntity, {
          where: { id: copyTradeSession.leaderId },
        });

        if (leader) {
          // Decrement the leader's follower count (ensure it doesn't go below 0)
          leader.followersCount = Math.max(0, Number(leader.followersCount) - 1);
          await queryRunner.manager.save(leader);
        }

        await this.hyperliquidService.stopAllOpenOrders(copier.fundWalletAddress, copier.fundWalletPrivateKey);
        await this.hyperliquidService.stopAllOpenPositions(copier.fundWalletAddress, copier.fundWalletPrivateKey);

        const balance = await queryRunner.manager.findOne(BalanceEntity, {
          where: {
            userId: userId,
          },
        });

        if (!balance) throw new BaseException(ERROR.BALANCE_NOT_FOUND, 400);

        const fundWalletPerpBalance = await this.hyperliquidService.getPerpBalanceOfWalletAddress(
          copier.fundWalletAddress,
        );

        await this.hyperliquidService.transferFromTo(
          copier.fundWalletAddress,
          copier.fundWalletPrivateKey,
          balance.balanceWalletAddress,
          fundWalletPerpBalance,
        );

        copyTradeSession.status = CopyTradeSessionStatus.COMPLETED;
        copyTradeSession.isActive = false;
        copyTradeSession.amountAfterStop = fundWalletPerpBalance;

        await queryRunner.manager.save(copyTradeSession);

        await queryRunner.manager.query(`
              UPDATE balance
              SET available_balance = available_balance + ${fundWalletPerpBalance}
              WHERE id = '${balance.id}'
          `);
      } else {
        throw new BaseException(ERROR.COPY_TRADE_SESSION_NOT_RUNNING, 400);
      }

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return copyTradeSession;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.logger.error(error);
      this.logger.error(error.stack);
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(ERROR.UNKNOWN_ERROR);
    }
  }

  async requestWithdraw(body: RequestWithdrawDto, userId: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) throw new BaseException(ERROR.USER_NOT_EXIST, 400);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(BalanceEntity, {
        where: {
          userId,
        },
      });
      if (!balance) throw new BaseException(ERROR.BALANCE_NOT_FOUND, 400);

      if (Number(balance.availableBalance) < Number(body.amount)) {
        this.logger.error(`User ${userId} has insufficient available balance: ${balance.availableBalance}`);
        throw new BaseException(ERROR.INSUFFICIENT_AVAILABLE_BALANCE + `: ${balance.availableBalance}`, 400);
      }

      const withdrawHistory = new WithdrawHistoryEntity();

      withdrawHistory.userId = userId;
      withdrawHistory.amount = body.amount;
      withdrawHistory.token = this.configService.getEnv('USDC_CONTRACT_ADDRESS');
      withdrawHistory.status = WithdrawHistoryStatus.PENDING_HYPERLIQUID;
      withdrawHistory.nonce = new Date().getTime();

      await queryRunner.manager.save(withdrawHistory);

      await queryRunner.manager.query(`
        UPDATE balance
        SET available_balance = available_balance - ${Number(body.amount)}
        WHERE user_id = '${userId}'
      `);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      await this.kafkaService.sendMessage(this.kafkaService.topics.requestWithdraw, {
        requestWithdrawId: withdrawHistory.id,
      });

      return withdrawHistory;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.logger.error(error);
      this.logger.error(error.stack);
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(ERROR.UNKNOWN_ERROR);
    }
  }

  /**
   * Get authenticated user's details without exposing private keys
   * @param jwtPayload JWT payload containing authenticated user data
   * @returns User details without sensitive information
   */
  async getMyUser(jwtPayload: JwtPayload): Promise<GetMyUserResponseDto> {
    const { userId } = jwtPayload;

    // Find user by ID
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BaseException(ERROR.USER_NOT_EXIST);
    }

    // Create response object with data from user entity
    // Note: We explicitly exclude any sensitive fields like private keys
    const response: GetMyUserResponseDto = {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return response;
  }

  async getDepositedHistoryById(userId: string, id: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) throw new BaseException('User not found', 400);

    const depositHistory = await this.depositHistoryRepository.findOne({
      where: {
        id: id,
      },
    });

    if (!depositHistory) throw new BaseException('Deposit history not found', 400);

    return depositHistory;
  }

  async getDepositedHistoryByTxHash(userId: string, txHash: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) throw new BaseException('User not found', 400);

    const depositHistory = await this.depositHistoryRepository.findOne({
      where: {
        txHash: txHash,
      },
    });

    if (!depositHistory) throw new BaseException('Deposit history not found', 400);

    return depositHistory;
  }

  async getWithdrawHistoryById(userId: string, id: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) throw new BaseException('User not found', 400);

    const withdrawHistory = await this.withdrawHistoryRepository.findOne({
      where: {
        id: id,
      },
    });

    if (!withdrawHistory) throw new BaseException('Withdraw history not found', 400);

    return withdrawHistory;
  }

  async test(userId: string) {
    const copier = await this.copierRepository.findOne({
      where: {
        userId: userId,
      },
    });
    const walletState = await this.hyperliquidService.getPerpStateOfWalletAddress(copier.fundWalletAddress);

    this.logger.log(walletState);

    // return this.hyperliquidService.getEstimatedCurrentPnLofAccount(copier.fundWalletAddress);
  }
}
