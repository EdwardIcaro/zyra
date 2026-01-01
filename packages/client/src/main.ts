// packages/client/src/main.ts

import { Application, Assets } from 'pixi.js';
import { Game } from './game/Game';

const API_URL = 'http://localhost:2567';

/**
 * Carrega TODOS os assets dinamicamente consultando o servidor
 */
async function loadAllAssets(): Promise<void> {
    console.log('📦 Carregando assets do jogo...');
    
    const folders = ['bodies', 'faces', 'hats'];
    const allAliases: string[] = [];

    for (const folder of folders) {
        try {
            const res = await fetch(`${API_URL}/api/admin/assets/${folder}`);
            
            if (!res.ok) {
                console.warn(`⚠️ Não foi possível carregar ${folder}`);
                continue;
            }

            const files: string[] = await res.json();
            
            console.log(`✅ Encontrados ${files.length} arquivos em ${folder}`);

            files.forEach((file: string) => {
                // Remove extensão .png para criar alias
                const alias = file.replace('.png', '').replace('.jpg', '');
                
                Assets.add({ 
                    alias, 
                    src: `/assets/sprites/${folder}/${file}` 
                });
                
                allAliases.push(alias);
            });
        } catch (e) {
            console.error(`❌ Erro ao carregar ${folder}:`, e);
        }
    }

    // Adicionar sprite vazio (para quando não houver equipamento)
    Assets.add({ 
        alias: 'none', 
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' 
    });
    allAliases.push('none');

    // Carregar todos de uma vez
    console.log(`🔄 Carregando ${allAliases.length} assets...`);
    
    try {
        await Assets.load(allAliases);
        console.log('✅ Todos os assets foram carregados com sucesso!');
    } catch (e) {
        console.error('❌ Erro ao carregar assets:', e);
        throw e;
    }
}

/**
 * Inicialização principal
 */
async function init() {
    const app = new Application();
    
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a1a,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true
    });

    document.body.appendChild(app.canvas as HTMLCanvasElement);

    // Configurar canvas
    app.canvas.style.position = "absolute";
    app.canvas.style.top = "0";
    app.canvas.style.left = "0";
    app.canvas.style.zIndex = "1";
    
    // Carregar assets dinamicamente
    try {
        await loadAllAssets();
    } catch (e) {
        console.error('❌ Falha crítica ao carregar assets!');
        alert('Erro ao carregar recursos do jogo. Verifique o console.');
        return;
    }

    // Remover loading screen
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');

    // Iniciar jogo
    const game = new Game(app);
    game.start();

    // Resize handler
    window.addEventListener('resize', () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        game.onResize(window.innerWidth, window.innerHeight);
    });
}

// Focus handler
window.addEventListener('mousedown', () => {
    window.focus();
});

// Iniciar
init();