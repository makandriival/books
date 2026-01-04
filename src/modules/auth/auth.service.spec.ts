import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { Role } from '../../common/enums/userRole.enum';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userService: UserService;

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockUserService = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException if user is not found', async () => {
    (userService.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.login('test@example.com', 'password')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw UnauthorizedException if password is invalid', async () => {
    const mockUser = {
      firstName: 'Test',
      lastName: 'Besicovitch',
      email: 'test@example.com',
      password: 'hashedPassword',
    };

    jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as User);
    jest.spyOn(service, 'validatePassword').mockResolvedValue(false);

    await expect(service.login('test@example.com', 'password')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return access and session tokens on successful login', async () => {
    const mockUser = {
      firstName: 'Test',
      lastName: 'Besicovitch',
      email: 'test@example.com',
      password: 'hashedPassword',
    };

    (userService.findOne as jest.Mock).mockResolvedValue(mockUser);
    jest.spyOn(service, 'validatePassword').mockResolvedValue(true);
    (jwtService.sign as jest.Mock).mockReturnValue('mockToken');
    const result = await service.login('test@example.com', 'hashedPassword');
    expect(result).toEqual({ access: 'mockToken', session: 'mockToken' });
  });

  it('should throw UnauthorizedException if token is invalid', async () => {
    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw new Error();
    });

    await expect(service.refresh('invalidToken')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw NotFoundException if user is not found', async () => {
    const mockDecoded = {
      userId: 'a78e0f1d-2cff-4b57-b65c-c29311ecc762',
      role: Role.MODERATOR,
      sub: 'test@example.com',
    };
    jest.spyOn(jwtService, 'verify').mockReturnValue(mockDecoded);
    jest.spyOn(userService, 'findOne').mockResolvedValue(undefined);

    await expect(service.refresh('validToken')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return access and session tokens if refresh is successful', async () => {
    const mockDecoded = {
      userId: 'a78e0f1d-2cff-4b57-b65c-c29311ecc762',
      role: Role.MODERATOR,
      sub: 'test@example.com',
    };
    const mockUser = {
      id: 'a78e0f1d-2cff-4b57-b65c-c29311ecc762',
      password: 'hashedPassword',
      email: 'test@example.com',
      status: true,
      role: Role.MODERATOR,
    };
    const updatedUser = {
      ...mockUser,
      token: 'newToken',
    };
    jest.spyOn(jwtService, 'verify').mockReturnValue(mockDecoded);
    jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as User);
    jest.spyOn(jwtService, 'sign').mockReturnValue('newToken');
    jest.spyOn(userService, 'update').mockResolvedValue(updatedUser as User);

    const result = await service.refresh('validToken');
    expect(result).toEqual({ access: 'newToken', session: 'newToken' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
