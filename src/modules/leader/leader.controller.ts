import { Public } from '../../shared/decorators/auth.decorator';
import { GetPositionsResponseDto } from '../common/dto/get-positions-response.dto';
import { CreateLeaderRequestDto } from './dto/create-leader-request.dto';
import { CreateLeaderResponseDto } from './dto/create-leader-response.dto';
import { GetLeaderAssetsRequestDto } from './dto/get-leader-assets-request.dto';
import { GetLeaderAssetsResponseDto } from './dto/get-leader-assets-response.dto';
import { GetLeaderChartRequestDto } from './dto/get-leader-chart-request.dto';
import { GetLeaderChartResponseDto } from './dto/get-leader-chart-response.dto';
import { GetLeaderDetailRequestDto } from './dto/get-leader-detail-request.dto';
import { GetLeaderDetailResponseDto } from './dto/get-leader-detail-response.dto';
import { GetLeaderTradingPairsRequestDto } from './dto/get-leader-trading-pairs-request.dto';
import { GetLeaderTradingPairsResponseDto } from './dto/get-leader-trading-pairs-response.dto';
import { GetLeaderTransactionsRequestDto } from './dto/get-leader-transactions-request.dto';
import { GetLeaderTransactionsResponseDto } from './dto/get-leader-transactions-response.dto';
import { GetLeadersRequestDto } from './dto/get-leaders-request.dto';
import { GetLeadersResponseDto } from './dto/get-leaders-response.dto';
import { LeaderChartService } from './leader-chart.service';
import { LeaderService } from './leader.service';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('leader')
@ApiBearerAuth()
@ApiTags('Leader')
export class LeaderController {
  constructor(
    private readonly leaderService: LeaderService,
    private readonly leaderChartService: LeaderChartService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all leaders with pagination and filters' })
  @ApiOkResponse({ type: GetLeadersResponseDto })
  async getLeaders(@Query() query: GetLeadersRequestDto): Promise<GetLeadersResponseDto> {
    console.log(query);
    return this.leaderService.getLeaders(query);
  }

  @Get('chart')
  @Public()
  @ApiOperation({ summary: 'Get chart data for a leader (PNL, ROI, or AUM)' })
  @ApiOkResponse({ type: GetLeaderChartResponseDto })
  async getLeaderChart(@Query() query: GetLeaderChartRequestDto): Promise<GetLeaderChartResponseDto> {
    return this.leaderChartService.getLeaderChartData(query);
  }

  @Get('detail')
  @Public()
  @ApiOperation({ summary: 'Get leader details by ID' })
  @ApiOkResponse({ type: GetLeaderDetailResponseDto })
  async getLeaderDetail(@Query() query: GetLeaderDetailRequestDto): Promise<GetLeaderDetailResponseDto> {
    return this.leaderService.getLeaderDetail(query);
  }

  @Get('transactions')
  @Public()
  @ApiOperation({ summary: 'Get transactions for a leader with pagination and filtering' })
  @ApiOkResponse({ type: GetLeaderTransactionsResponseDto })
  async getLeaderTransactions(
    @Query() query: GetLeaderTransactionsRequestDto,
  ): Promise<GetLeaderTransactionsResponseDto> {
    return this.leaderService.getLeaderTransactions(query);
  }

  @Get('positions')
  @Public()
  @ApiOperation({ summary: 'Get current positions for a leader' })
  @ApiOkResponse({ type: GetPositionsResponseDto })
  async getLeaderPositions(@Query('leaderId') leaderId: string) {
    return this.leaderService.getLeaderPositions(leaderId);
  }

  @Get('trading-pairs')
  @Public()
  @ApiOperation({ summary: 'Get most traded pairs for a leader' })
  @ApiOkResponse({ type: GetLeaderTradingPairsResponseDto })
  async getLeaderTradingPairs(
    @Query() query: GetLeaderTradingPairsRequestDto,
  ): Promise<GetLeaderTradingPairsResponseDto> {
    return this.leaderService.getLeaderTradingPairs(query);
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new leader' })
  @ApiCreatedResponse({ type: CreateLeaderResponseDto })
  async createLeader(@Body() createLeaderDto: CreateLeaderRequestDto): Promise<CreateLeaderResponseDto> {
    console.log('Creating leader with data:', createLeaderDto);
    return this.leaderService.createLeader(createLeaderDto);
  }
}
