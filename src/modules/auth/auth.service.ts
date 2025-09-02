import type { JwtPayload } from '../../shared/dto/jwt-payload.dto';
import type { LoginRequestDto } from './dto/login-request.dto';
import type { LoginResponseDto } from './dto/login-response.dto';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { ethers } from 'ethers';
import type { Redis } from 'ioredis';
import { CACHE_CONSTANT } from 'src/constants/cache.constant';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { ERROR } from 'src/constants/exception.constant';
import { BalanceEntity } from 'src/entities/balance.entity';
import { CopierEntity } from 'src/entities/copier.entity';
import { UserEntity } from 'src/entities/user.entity';
import { BaseException } from 'src/shared/filters/exception.filter';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private redisInstance: Redis;

  constructor(
    @InjectRepository(UserEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly userRepository: Repository<UserEntity>,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly apiConfigService: ApiConfigService,
  ) {
    this.redisInstance = this.redisService.getClient(COMMON_CONSTANT.REDIS_DEFAULT_NAMESPACE);
  }

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.apiConfigService.getEnv('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
      secret: this.apiConfigService.getEnv('JWT_REFRESH_TOKEN_SECRET'),
    });
  }

  private generateAuthMessage(nonce: string, timestamp: number): string {
    return `Sign this message to authenticate with EmulateX:\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  }

  getAuthMessage(): { message: string; nonce: string; timestamp: number } {
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    return {
      message: this.generateAuthMessage(nonce, timestamp),
      nonce,
      timestamp,
    };
  }

  private async validateAuthMessage(
    signature: string,
    walletAddress: string,
    nonce: string,
    timestamp: number,
  ): Promise<boolean> {
    // Check if the signature is not older than 5 minutes
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (now - timestamp > fiveMinutes) {
      return false;
    }

    const message = this.generateAuthMessage(nonce, timestamp);
    const signerAddr = ethers.verifyMessage(message, signature);
    return signerAddr.toLowerCase() === walletAddress.toLowerCase();
  }

  async login(loginRequestDto: LoginRequestDto): Promise<LoginResponseDto> {
    const { walletAddress, signature, nonce, timestamp } = loginRequestDto;

    try {
      // Verify the signature
      if (this.apiConfigService.getEnv('NODE_ENV') !== 'development') {
        const isValid = await this.validateAuthMessage(signature, walletAddress, nonce, timestamp);
        if (!isValid) {
          throw new BaseException(ERROR.INVALID_SIGNATURE);
        }
      }

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (!user) {
        // Start a transaction to ensure both user and copier are created together
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // Create new user
          const newUser = new UserEntity();
          newUser.walletAddress = walletAddress.toLowerCase();
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

          this.logger.log(
            `Created new user ${user.id} with copier and fund wallet ${newCopier.fundWalletAddress} and balance ${newBalance.id}`,
          );

          // Commit the transaction
          await queryRunner.commitTransaction();
        } catch (error) {
          // Rollback the transaction in case of error
          await queryRunner.rollbackTransaction();
          this.logger.error(`Failed to create user and copier: ${error.message}`, error.stack);
          throw new BaseException(ERROR.UNKNOWN_ERROR);
        } finally {
          // Release the query runner
          await queryRunner.release();
        }
      }

      const payload: JwtPayload = {
        userId: user.id,
        walletAddress: user.walletAddress.toLowerCase(),
      };

      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      const signatureAccessToken = accessToken.split('.')[2];
      const signatureRefreshToken = refreshToken.split('.')[2];

      await this.redisInstance.hsetnx(
        `${CACHE_CONSTANT.SESSION_PREFIX}${user.id}`,
        signatureAccessToken,
        signatureRefreshToken,
      );

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof BaseException) {
        throw error;
      }
      throw new BaseException(ERROR.UNKNOWN_ERROR);
    }
  }

  async logout(accessToken: string, userId: string): Promise<boolean> {
    const signature = accessToken.split('.')[2];
    const logoutResult = await this.redisInstance.hdel(`${CACHE_CONSTANT.SESSION_PREFIX}${userId}`, signature);

    return Boolean(logoutResult);
  }

  async revokeUser(userId: string): Promise<boolean> {
    const revokeResult = await this.redisInstance.del(`${CACHE_CONSTANT.SESSION_PREFIX}${userId}`);

    return Boolean(revokeResult);
  }

  async refreshToken(accessToken: string, refreshToken: string): Promise<LoginResponseDto> {
    const signatureAccessToken = accessToken.split('.')[2];
    const signatureRefreshToken = refreshToken.split('.')[2];

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.apiConfigService.getEnv('JWT_REFRESH_TOKEN_SECRET'),
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        payload = this.jwtService.decode(refreshToken) as JwtPayload;
        await this.redisInstance.hdel(`${CACHE_CONSTANT.SESSION_PREFIX}${payload.userId}`, signatureAccessToken);

        throw new BaseException(ERROR.REFRESH_TOKEN_EXPIRED);
      } else {
        throw new BaseException(ERROR.REFRESH_TOKEN_FAIL);
      }
    }

    const signatureRefreshTokenCache = await this.redisInstance.hget(
      `${CACHE_CONSTANT.SESSION_PREFIX}${payload.userId}`,
      signatureAccessToken,
    );

    if (!signatureRefreshTokenCache || signatureRefreshTokenCache !== signatureRefreshToken) {
      throw new BaseException(ERROR.REFRESH_TOKEN_FAIL);
    }

    const newAccessToken = this.generateAccessToken({
      userId: payload.userId,
      walletAddress: payload.walletAddress.toLowerCase(),
    });

    const newRefreshToken = this.generateRefreshToken({
      userId: payload.userId,
      walletAddress: payload.walletAddress.toLowerCase(),
    });

    const newSignatureAccessToken = newAccessToken.split('.')[2];
    const newSignatureRefreshToken = newRefreshToken.split('.')[2];

    await this.redisInstance.hsetnx(
      `${CACHE_CONSTANT.SESSION_PREFIX}${payload.userId}`,
      newSignatureAccessToken,
      newSignatureRefreshToken,
    );

    await this.redisInstance.hdel(`${CACHE_CONSTANT.SESSION_PREFIX}${payload.userId}`, signatureAccessToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
