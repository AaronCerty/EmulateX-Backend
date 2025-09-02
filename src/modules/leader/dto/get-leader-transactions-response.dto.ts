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
    description: 'Transaction hash',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Timestamp of the transaction in milliseconds',
    example: '1718452370000',
  })
  timestampMs: string;

  @ApiProperty({
    description: 'Error message if the transaction failed',
    example: '',
  })
  errorMessage: string;

  @ApiProperty({
    description: 'Creation date of transaction record',
    example: '2025-04-15T15:12:50.000Z',
  })
  createdAt: Date;
}

export class GetLeaderTransactionsResponseDto {
  @ApiProperty({
    description: 'UUID of the leader',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  leaderId: string;

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
    description: 'Trasaction metadata',
    example: {},
  })
  metadata?: any;
}
