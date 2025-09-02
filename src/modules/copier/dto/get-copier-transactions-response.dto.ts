import { LeaderType, RiskLevel } from '../../../constants/leader.constant';
import { TransactionDirection, TransactionStatus, TransactionType } from '../../../entities/transaction.entity';
import { ApiProperty } from '@nestjs/swagger';

export class TransactionItemDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id: string;

  @ApiProperty({
    description: 'Chain ID',
    example: 1,
  })
  chainId: number;

  @ApiProperty({
    description: 'Base currency',
    example: 'BTC',
  })
  base: string;

  @ApiProperty({
    description: 'Quote currency',
    example: 'USDT',
  })
  quote: string;

  @ApiProperty({
    description: 'Amount of the transaction',
    example: 0.5,
  })
  amount: number;

  @ApiProperty({
    description: 'Price of the asset',
    example: 63000.0,
  })
  price: number;

  @ApiProperty({
    description: 'Total value of the transaction',
    example: 31500.0,
  })
  totalValue: number;

  @ApiProperty({
    description: 'Direction of the transaction',
    enum: TransactionDirection,
    example: TransactionDirection.BUY,
  })
  direction: TransactionDirection;

  @ApiProperty({
    description: 'Type of the transaction',
    enum: TransactionType,
    example: TransactionType.SPOT,
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Status of the transaction',
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @ApiProperty({
    description: 'Transaction hash on the blockchain',
    example: '0x1234567890abcdef',
    required: false,
  })
  transactionHash?: string;

  @ApiProperty({
    description: 'Timestamp of the transaction in milliseconds',
    example: 1625097600000,
  })
  timestampMs: number;

  @ApiProperty({
    description: 'Error message if the transaction failed',
    required: false,
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
  })
  metadata?: any;

  @ApiProperty({
    description: 'Leader data associated with this transaction',
    required: false,
  })
  leader?: {
    id: string;
    name: string;
    avt: string;
    imageUrl: string;
    riskLevel: RiskLevel;
    leaderType: LeaderType;
  };

  @ApiProperty({
    description: 'ID of the leader transaction that this copier transaction copied from',
    required: false,
  })
  copyFromTransaction?: string;
}

export class GetCopierTransactionsResponseDto {
  @ApiProperty({
    description: 'UUID of the copier',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  copierId: string;

  @ApiProperty({
    description: 'List of transactions',
    type: [TransactionItemDto],
  })
  transactions: TransactionItemDto[];

  @ApiProperty({
    description: 'Total number of transactions',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Transaction metadata',
    example: {},
    required: false,
  })
  metadata?: any;
}
