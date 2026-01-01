const redis = require('redis');

async function testRedis() {
  // Criar cliente
  const client = redis.createClient({
    socket: {
      host: 'localhost',
      port: 6379
    }
    // Se tiver senha:
    // password: 'sua_senha'
  });

  // Conectar
  await client.connect();
  console.log('✅ Conectado ao Redis!');

  // Testar SET
  await client.set('zyra:test', 'Hello from ZYRA!');
  console.log('✅ Chave definida');

  // Testar GET
  const value = await client.get('zyra:test');
  console.log('📦 Valor recuperado:', value);

  // Testar com expiração
  await client.setEx('zyra:temp', 10, 'Expira em 10s');
  console.log('⏰ Chave temporária criada');

  // Ver tempo restante
  const ttl = await client.ttl('zyra:temp');
  console.log('⏱️ TTL:', ttl, 'segundos');

  // Limpar
  await client.del('zyra:test', 'zyra:temp');
  console.log('🗑️ Chaves removidas');

  // Desconectar
  await client.disconnect();
  console.log('✅ Desconectado');
}

testRedis().catch(console.error);