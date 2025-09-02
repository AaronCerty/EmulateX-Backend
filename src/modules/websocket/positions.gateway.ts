import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'positions',
})
export class PositionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(PositionsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcast leader positions to all clients
   */
  broadcastLeaderPositions(positions: any) {
    this.logger.debug('Broadcasting all leader positions');
    this.server.emit('leader_positions', {
      positions,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast copier positions to all clients
   */
  broadcastCopierPositions(positions: any) {
    this.logger.debug('Broadcasting all copier positions');
    this.server.emit('copier_positions', {
      positions,
      timestamp: new Date().toISOString(),
    });
  }
}
