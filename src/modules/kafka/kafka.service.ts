import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Consumer, EachMessagePayload, Kafka, Partitioners, Producer, logLevel } from 'kafkajs';
import { ApiConfigService } from 'src/shared/services/api-config.service';

@Injectable()
export class KafkaService implements OnApplicationShutdown {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isProducerConnected: boolean = false;
  private consumers: Consumer[] = [];
  static readonly partitions = 30;

  public readonly topics = {
    leaderOrderTopic: 'leader_order_topic',
    copierOrderTopic: 'copier_order_topic',

    // queues for create copy trade topic:
    createCopyTradeTopic: 'create_copy_trade_topic',
    // end of queues for create copy trade topic

    // queues for hyperliquid topic:
    depositToHyperliquid: 'deposit_to_hyperliquid',
    verifyDepositedOnHyperliquid: 'verify_deposited_on_hyperliquid',
    requestWithdraw: 'request_withdraw',
    // end of queues for hyperliquid topic

    // test topic 100$
    testTopic100: 'test_topic_100',
  };

  constructor(private configService: ApiConfigService) {
    this.initialize();
  }

  private async initialize() {
    await this.initializeKafka();

    await this.initializeProducers();
  }

  private async initializeKafka() {
    const brokerUrl = this.configService.getEnv('KAFKA_BROKER_URL');
    const kafkaLogLevel = this.configService.getEnv('KAFKA_LOG_LEVEL') || 'INFO';

    this.logger.debug(`Initializing Kafka with broker: ${brokerUrl}`);

    const config: any = {
      clientId: 'emulate-x-server',
      brokers: [brokerUrl],
      logLevel: logLevel[kafkaLogLevel as keyof typeof logLevel],
      connectionTimeout: 15000,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 15000,
        factor: 0.2,
      },
    };

    this.logger.debug('Creating Kafka instance with config:', {
      ...config,
    });
    this.kafka = new Kafka(config);

    // Create topics if not exist
    const admin = this.kafka.admin();
    await admin.connect();
    const existingTopics = await admin.listTopics();
    const topicsToCreate = Object.values(this.topics).filter((topic) => !existingTopics.includes(topic));
    if (topicsToCreate.length > 0) {
      this.logger.debug(`Creating topics: ${topicsToCreate}`);
      await admin.createTopics({
        topics: topicsToCreate.map((topic) => ({
          topic,
          numPartitions: 1,
          replicationFactor: 1,
        })),
      });
    }
    await admin.disconnect();
  }

  private async initializeProducers() {
    try {
      // Initialize hourly producer
      this.logger.debug('Creating Kafka producer');
      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.LegacyPartitioner,
        transactionTimeout: 30000,
      });
      this.logger.debug('Connecting producer...');
      await this.producer.connect();
      this.logger.debug('Producer connected successfully');
      this.isProducerConnected = true;
    } catch (error) {
      this.logger.error('Failed to initialize producers:', error);
      throw error;
    }
  }

  private async createConsumer(groupId: string): Promise<Consumer | null> {
    try {
      this.logger.debug(`Creating consumer with groupId: ${groupId}`);
      const consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: Number(this.configService.getEnv('KAFKA_SESSION_TIMEOUT')) || 30000,
        heartbeatInterval: 3000,
        retry: {
          initialRetryTime: 100,
          retries: 8,
          maxRetryTime: 15000,
          factor: 0.2,
        },
        allowAutoTopicCreation: false,
        readUncommitted: false,
      });

      this.consumers.push(consumer);
      this.logger.debug(`Consumer created successfully with groupId: ${groupId}`);
      return consumer;
    } catch (error) {
      this.logger.error(`Failed to create consumer with groupId ${groupId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createConsumerProcessor(
    topic: string,
    groupId: string,
    callback: (payload: EachMessagePayload) => Promise<void>,
  ) {
    if (!this.configService.isConsumerMode()) {
      return;
    }

    try {
      this.logger.debug(`Creating consumer processor for topic: ${topic}, groupId: ${groupId}`);
      const consumer = await this.createConsumer(groupId);
      if (!consumer) {
        return;
      }

      try {
        this.logger.debug('Connecting consumer...');
        await consumer.connect();
        this.logger.debug('Consumer connected successfully');

        this.logger.debug(`Subscribing to topic: ${topic}`);
        await consumer.subscribe({
          topic,
          fromBeginning: true,
        });
        this.logger.debug(`Successfully subscribed to topic: ${topic}`);

        await consumer.run({
          eachMessage: async (payload: EachMessagePayload) => {
            try {
              this.logger.debug(
                `Processing message from topic: ${payload.topic}, partition: ${payload.partition}, offset: ${payload.message.offset}`,
              );
              await callback(payload);
              this.logger.debug(
                `Successfully processed message from topic: ${payload.topic}, partition: ${payload.partition}, offset: ${payload.message.offset}`,
              );
            } catch (error) {
              this.logger.error(
                `Error processing message from topic: ${payload.topic}, partition: ${payload.partition}, offset: ${payload.message.offset}`,
                error.stack,
              );
              throw error; // Re-throw to trigger consumer group rebalancing if needed
            }
          },
          autoCommit: true,
          autoCommitInterval: 5000,
          autoCommitThreshold: 100,
        });

        this.logger.debug(`Consumer processor successfully created for topic: ${topic}, groupId: ${groupId}`);
      } catch (error) {
        this.logger.error(`Failed to setup consumer processor: ${error.message}`, error.stack);
        // Clean up the consumer if setup fails
        try {
          await consumer.disconnect();
        } catch (disconnectError) {
          this.logger.error(`Failed to disconnect consumer: ${disconnectError.message}`);
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to create consumer processor: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async disconnectConsumers() {
    for (const consumer of this.consumers) {
      try {
        await consumer.disconnect();
        this.logger.debug('Consumer disconnected');
      } catch (error) {
        this.logger.error('Error disconnecting consumer:', error);
      }
    }
  }

  private async disconnectProducers() {
    if (this.isProducerConnected) {
      try {
        await this.producer.disconnect();
        this.isProducerConnected = false;
        this.logger.debug('Producer disconnected');
      } catch (error) {
        this.logger.error('Error disconnecting producer:', error);
      }
    }
  }

  async onApplicationShutdown() {
    this.logger.debug('Application is shutting down, disconnecting Kafka clients...');
    await this.disconnectConsumers();
    await this.disconnectProducers();
  }

  async sendMessage(topic: string, message: any, key?: string) {
    if (!this.isProducerConnected) {
      this.logger.error('Producer is not connected. Cannot send message.');
      return false;
    }

    try {
      this.logger.debug(`Sending message to topic: ${topic}`);
      await this.producer.send({
        topic,
        messages: [
          {
            key: key || String(Date.now()),
            value: typeof message === 'string' ? message : JSON.stringify(message),
          },
        ],
      });
      this.logger.debug(`Message sent successfully to topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to topic ${topic}: ${error.message}`, error.stack);
      return false;
    }
  }
}
