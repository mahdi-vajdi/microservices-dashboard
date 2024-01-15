import {
  SignupDto,
  RefreshTokensDto,
  SignoutDto,
  AuthSubjects,
  AuthTokensDto,
  SigninDto,
} from '@app/common';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { map } from 'rxjs';
import { RefreshTokenGuard } from '../guards/refresh-token.guard';
import { SignupDto as HtppSignupDto } from '../dto/auth/signup.dto';
import { SigninDto as HtppSigninDto } from '../dto/auth/signin.dto';
import { NatsJetStreamClientProxy } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { AccessTokenGuard } from '../guards/access-token.guard';
import { JwtPayloadDto } from '../dto/auth/jwt-payload.dto';

@Controller('auth')
export class AuthHttpController {
  constructor(private readonly natsClient: NatsJetStreamClientProxy) {}

  @Post('signup')
  signup(
    @Res({ passthrough: true }) res: Response,
    @Body() signupDto: HtppSignupDto,
  ) {
    return this.natsClient
      .send<AuthTokensDto, SignupDto>({ cmd: AuthSubjects.SIGNUP }, signupDto)
      .pipe(
        map((tokens) => {
          if (tokens) {
            this.setTokensToCookies(res, tokens);
          } else {
            throw new InternalServerErrorException(
              'Something went wrong issuing tokens. please sign in',
            );
          }

          return null;
        }),
      );
  }

  @Post('signin')
  signin(
    @Res({ passthrough: true }) res: Response,
    @Body() signinDto: HtppSigninDto,
  ) {
    return this.natsClient
      .send<AuthTokensDto, SigninDto>({ cmd: AuthSubjects.SIGNIN }, signinDto)
      .pipe(
        map((tokens) => {
          if (tokens) {
            this.setTokensToCookies(res, tokens);
          } else {
            throw new InternalServerErrorException(
              'Something went wrong issuing tokens. please sign in',
            );
          }

          return null;
        }),
      );
  }

  @UseGuards(AccessTokenGuard)
  @Post('signout')
  signout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): void {
    const jwtPayload = req['user'] as JwtPayloadDto;
    this.natsClient.emit<void, SignoutDto>(AuthSubjects.SIGNOUT, {
      agentId: jwtPayload.sub,
    });
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  @UseGuards(RefreshTokenGuard)
  @Get('refresh')
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // the refreshToken jwt has been validated by refreshTokenGuard
    const refreshToken = req.cookies.refresh_token;
    const jwtPayload = req['user'] as JwtPayloadDto;
    return this.natsClient
      .send<AuthTokensDto | null, RefreshTokensDto>(
        { cmd: AuthSubjects.REFRESH_TOKENS },
        {
          agentId: jwtPayload.sub,
          refreshToken,
        },
      )
      .pipe(
        map((tokens) => {
          if (tokens) {
            this.setTokensToCookies(res, tokens);
          } else {
            throw new InternalServerErrorException(
              'Something went wrong issuing tokens. please sign in',
            );
          }

          return null;
        }),
      );
  }

  private setTokensToCookies(res: Response, tokens: AuthTokensDto) {
    res.cookie('access_token', tokens.accessToken, {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
    });
  }
}
