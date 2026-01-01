export class InputSystem {
  private keys = new Map<string, boolean>();
  private mousePosition = { x: 0, y: 0 };
  

  constructor() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      // Bloqueia comportamento padrão de movimentação e scroll
      const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space'];
      console.log(`Tecla: ${e.key} | Code: ${e.code}`);
      
      // Armazenamos tanto o code quanto a key para máxima compatibilidade
      this.keys.set(e.code, true);
      this.keys.set(e.key.toLowerCase(), true);

      if (movementKeys.includes(e.code) || movementKeys.includes(e.key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
      this.keys.set(e.key.toLowerCase(), false);
    });

    // Mouse position tracking
    window.addEventListener('mousemove', (e) => {
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    });

    // SEGURANÇA: Se o usuário trocar de aba (Alt+Tab), limpamos tudo
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) this.keys.clear();
    });
  }
  

  isKeyDown(keyOrCode: string): boolean {
    return this.keys.get(keyOrCode) || this.keys.get(keyOrCode.toLowerCase()) || false;
  }

  getMovementInput(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;

    // Checa W / S / Setas Verticais
    if (this.isKeyDown('KeyW') || this.isKeyDown('w') || this.isKeyDown('ArrowUp')) dy -= 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('s') || this.isKeyDown('ArrowDown')) dy += 1;

    // Checa A / D / Setas Horizontais
    if (this.isKeyDown('KeyA') || this.isKeyDown('a') || this.isKeyDown('ArrowLeft')) dx -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('d') || this.isKeyDown('ArrowRight')) dx += 1;

    // Normalização para velocidade diagonal não ser maior que 1
    if (dx !== 0 && dy !== 0) {
      const mag = Math.sqrt(dx * dx + dy * dy);
      dx /= mag;
      dy /= mag;
    }

    return { dx, dy };
  }

  getMousePosition() {
    return { ...this.mousePosition };
  }

  clear() {
    this.keys.clear();
  }
  
}