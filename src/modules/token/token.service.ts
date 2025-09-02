import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { TokenEntity } from 'src/entities/token.entity';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { Repository } from 'typeorm';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(TokenEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly tokenRepository: Repository<TokenEntity>,
    private readonly configService: ApiConfigService,
  ) {}

  async fetchTokenMetadata(symbol: string): Promise<any> {
    const symbols = await symbol.split(',');
    const result = [];
    for (const s of symbols) {
      result.push(await this._fetchTokenMetadata(s));
    }
    return result;
  }

  private async _fetchTokenMetadata(symbol: string): Promise<any> {
    try {
      const token = await this.tokenRepository.findOne({
        where: {
          symbol: symbol,
        },
      });

      if (token) {
        return token;
      }

      this.logger.log(`Fetching metadata for token: ${symbol}`);

      const response2 = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/map', {
        params: { symbol: symbol },
        headers: {
          'X-CMC_PRO_API_KEY': this.configService.getEnv('COIN_MARKET_CAP_API_KEY'),
        },
      });

      const response = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/info', {
        params: { id: response2.data.data[0].id },
        headers: {
          'X-CMC_PRO_API_KEY': this.configService.getEnv('COIN_MARKET_CAP_API_KEY'),
        },
      });

      this.logger.log(response.data);

      const tokenData = response.data.data[Object.keys(response.data.data)[0]];

      const newToken = new TokenEntity();
      newToken.name = tokenData.name;
      newToken.symbol = tokenData.symbol;
      newToken.logoImg = tokenData.logo;
      newToken.slug = tokenData.slug;

      return this.tokenRepository.save(newToken);
    } catch (error) {
      this.logger.error(`Error fetching token metadata for ${symbol}: ${error.message}`);
      this.logger.error(error);
      const newToken = new TokenEntity();
      newToken.symbol = symbol;
      return newToken;
    }
  }
}
