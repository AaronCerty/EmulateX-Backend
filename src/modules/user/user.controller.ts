import { GetMyUserResponseDto } from './dto/get-my-user-response.dto';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetHistoryDto } from 'src/modules/user/dto/get-deposited-history.dto';
import { RequestWithdrawDto } from 'src/modules/user/dto/request-withdraw.dto';
import { StartCopyTradeDto } from 'src/modules/user/dto/start-copy-trade.dto';
import { StopCopyTradeDto } from 'src/modules/user/dto/stop-copy-trade.dto';
import { UserService } from 'src/modules/user/user.service';
import { JwtDecodedData } from 'src/shared/decorators/auth.decorator';
import { JwtPayload } from 'src/shared/dto/jwt-payload.dto';
import { JwtAuthGuard } from 'src/shared/guards/auth.guard';

@Controller('user')
@ApiTags('User')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@JwtDecodedData() data: JwtPayload, @Query() query: GetHistoryDto) {
    return this.userService.getHistory(data.userId, query);
  }

  @Get('deposited-status')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: 'tx-hash',
    required: true,
    description: 'Transaction hash of deposit to get',
  })
  getDepositedStatus(@JwtDecodedData() data: JwtPayload, @Query('tx-hash') txHash: string) {
    return this.userService.getDepositedHistoryByTxHash(data.userId, txHash);
  }

  @Get('deposited-history')
  @UseGuards(JwtAuthGuard)
  getDepositedHistory(@JwtDecodedData() data: JwtPayload, @Query() query: GetHistoryDto) {
    return this.userService.getDepositedHistory(data.userId, query);
  }

  @Get('deposited-history/:id')
  @UseGuards(JwtAuthGuard)
  getDepositedHistoryById(@JwtDecodedData() data: JwtPayload, @Param('id') id: string) {
    return this.userService.getDepositedHistoryById(data.userId, id);
  }

  @Get('withdraw-history')
  @UseGuards(JwtAuthGuard)
  getWithdrawHistory(@JwtDecodedData() data: JwtPayload, @Query() query: GetHistoryDto) {
    return this.userService.getWithdrawHistory(data.userId, query);
  }

  @Get('withdraw-history/:id')
  @UseGuards(JwtAuthGuard)
  getWithdrawHistoryById(@JwtDecodedData() data: JwtPayload, @Param('id') id: string) {
    return this.userService.getWithdrawHistoryById(data.userId, id);
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@JwtDecodedData() data: JwtPayload) {
    return this.userService.getBalance(data.userId);
  }

  @Post('start-copy-trade')
  @UseGuards(JwtAuthGuard)
  startCopyTrade(@Body() body: StartCopyTradeDto, @JwtDecodedData() data: JwtPayload) {
    return this.userService.startCopyTrade(body, data.userId);
  }

  @Post('stop-copy-trade')
  @UseGuards(JwtAuthGuard)
  stopCopyTrade(@Body() body: StopCopyTradeDto, @JwtDecodedData() data: JwtPayload) {
    return this.userService.stopCopyTrade(body, data.userId);
  }

  @Post('request-withdraw')
  @UseGuards(JwtAuthGuard)
  requestWithdraw(@Body() body: RequestWithdrawDto, @JwtDecodedData() data: JwtPayload) {
    return this.userService.requestWithdraw(body, data.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get authenticated user details' })
  @ApiOkResponse({ type: GetMyUserResponseDto })
  async getMyUser(@JwtDecodedData() data: JwtPayload): Promise<GetMyUserResponseDto> {
    return this.userService.getMyUser(data);
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  test(@JwtDecodedData() data: JwtPayload) {
    return this.userService.test(data.userId);
  }
}
