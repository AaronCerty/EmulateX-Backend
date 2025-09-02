import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TokenService } from 'src/modules/token/token.service';
import { Public } from 'src/shared/decorators/auth.decorator';

@Controller('token')
@ApiBearerAuth()
@ApiTags('Token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('fetch')
  @Public()
  @ApiQuery({ name: 'symbol', required: true, example: 'btc,eth,bnb', description: 'Token symbol to get data' })
  async getchTokenMetadata(@Query('symbol') symbol: string): Promise<any> {
    return this.tokenService.fetchTokenMetadata(symbol.toLowerCase());
  }
}
