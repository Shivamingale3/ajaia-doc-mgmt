import { type NextFunction, type Request, type Response } from 'express';
import { logger } from '../utils/logger.js';
class AuthController {
  public login(request: Request, response: Response, next: NextFunction): void {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
    logger.info(`this is login ${request},${response},${next}`);
    response.send('Login request for user');
  }
}
const authController = new AuthController();
export default authController;
