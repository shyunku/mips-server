import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import seed from './seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  await app.listen(8100);

  await seed();
}
bootstrap();
