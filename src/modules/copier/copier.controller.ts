import { JwtDecodedData, Public } from '../../shared/decorators/auth.decorator';
import { GetPositionsResponseDto } from '../common/dto/get-positions-response.dto';
import { GetCopierChartRequestDto } from './dto/get-copier-chart-request.dto';
import { GetCopierChartResponseDto } from './dto/get-copier-chart-response.dto';
import { GetCopierTransactionsRequestDto } from './dto/get-copier-transactions-request.dto';
import { GetCopierTransactionsResponseDto } from './dto/get-copier-transactions-response.dto';
import { GetMyCopierChartRequestDto } from './dto/get-my-copier-chart-request.dto';
import { GetMyCopierResponseDto } from './dto/get-my-copier-response.dto';
import { GetMyCopierTransactionsRequestDto } from './dto/get-my-copier-transactions-request.dto';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CopierService } from 'src/modules/copier/copier.service';
import { GetCopyingLeadersResponseDto } from 'src/modules/copier/dto/get-copying-leaders-response.dto';
import { JwtPayload } from 'src/shared/dto/jwt-payload.dto';

@ApiTags('Copier')
@ApiBearerAuth()
@Controller('copier')
export class CopierController {
  constructor(private readonly copierService: CopierService) {}

  @Get('me/charts')
  @ApiOperation({ summary: 'Get chart data for the authenticated copier (ROI or PNL)' })
  @ApiOkResponse({ type: GetCopierChartResponseDto })
  async getMyCopierChart(
    @Query() query: GetMyCopierChartRequestDto,
    @JwtDecodedData() jwtPayload: JwtPayload,
  ): Promise<GetCopierChartResponseDto> {
    return this.copierService.getMyCopierChart(query, jwtPayload);
  }

  @Get('me')
  @ApiOperation({ summary: "Get authenticated user's copier details" })
  @ApiOkResponse({ type: GetMyCopierResponseDto })
  async getMyCopier(@JwtDecodedData() jwtPayload: JwtPayload): Promise<GetMyCopierResponseDto> {
    return this.copierService.getMyCopier(jwtPayload);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: "Get authenticated user's copier transactions" })
  @ApiOkResponse({ type: GetCopierTransactionsResponseDto })
  async getMyCopierTransactions(
    @Query() query: GetMyCopierTransactionsRequestDto,
    @JwtDecodedData() jwtPayload: JwtPayload,
  ): Promise<GetCopierTransactionsResponseDto> {
    return this.copierService.getMyCopierTransactions(query, jwtPayload);
  }

  @Get('me/positions')
  @ApiOperation({ summary: "Get authenticated user's copier current positions" })
  @ApiOkResponse({ type: GetPositionsResponseDto })
  async getMyCopierPositions(@JwtDecodedData() jwtPayload: JwtPayload) {
    return this.copierService.getMyCopierPositions(jwtPayload);
  }

  @Get('me/copying-leaders')
  @ApiOperation({ summary: "Get all leaders that the authenticated user's copier is following" })
  @ApiOkResponse({ type: GetCopyingLeadersResponseDto })
  async getMyCopyingLeaders(@JwtDecodedData() jwtPayload: JwtPayload) {
    return this.copierService.getMyCopyingLeaders(jwtPayload);
  }
}
