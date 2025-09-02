import { JwtPayload } from '../../shared/dto/jwt-payload.dto';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token-request.dto';
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto';
import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtDecodedData, Public } from 'src/shared/decorators/auth.decorator';

@Controller('auth')
@ApiTags('Auth')
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login with wallet address and signature' })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() loginRequestDto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(loginRequestDto);
  }

  @Get('sign-message')
  @Public()
  @ApiOperation({ summary: 'Get a message to sign for authentication' })
  @ApiOkResponse({
    schema: { properties: { message: { type: 'string' }, nonce: { type: 'string' }, timestamp: { type: 'number' } } },
  })
  getAuthMessage(): { message: string; nonce: string; timestamp: number } {
    return this.authService.getAuthMessage();
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify current authentication token and get user data' })
  @ApiOkResponse({ type: JwtPayload })
  verify(@JwtDecodedData() data: JwtPayload): JwtPayload {
    return data;
  }

  @Post('refresh-token')
  @Public()
  @ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
  @ApiOkResponse({ type: RefreshTokenResponseDto })
  refreshToken(@Body() refreshTokenRequestDto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(refreshTokenRequestDto.accessToken, refreshTokenRequestDto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate current access token' })
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(@Req() req: Request, @JwtDecodedData() data: JwtPayload): Promise<LogoutResponseDto> {
    const token = req.headers.authorization.split(' ')[1];
    const logoutResult = await this.authService.logout(token, data.userId);

    return {
      logoutResult,
    };
  }
}
