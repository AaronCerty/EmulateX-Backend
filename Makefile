sync-db:
	find src/migrations -type f ! -name MIGRATION-GUIDE.md -delete
	yarn typeorm:generate
	yarn typeorm:migrate

run-prod:
	docker-compose build
	docker-compose up -d

reset: 
	docker compose down 
	rm -rf ./postgres-data
	rm -rf ./redis-data
	rm -rf ./redpanda-data
	docker compose up -d 
	sleep 5
	yarn typeorm:migrate

start-api:
	APP_MODE=api yarn start:dev

start-crawler-blockchain:
	APP_MODE=crawler-blockchain yarn start:dev

start-funding-consumer:
	APP_MODE=funding-consumer yarn start:dev

	