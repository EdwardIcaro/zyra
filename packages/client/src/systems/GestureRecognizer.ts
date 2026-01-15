import { Point } from 'pixi.js';

export enum GestureType {
  NONE = 'none',
  CIRCLE = 'circle',
  ZIGZAG = 'zigzag',
  TRIANGLE = 'triangle',
  HORIZONTAL_SLASH = 'slash',
  VERTICAL_LINE = 'line'
}

interface GestureResult {
  type: GestureType;
  confidence: number;
  path: Point[];
}

export class GestureRecognizer {
  private currentPath: Point[] = [];
  private isDrawing: boolean = false;
  private readonly MIN_POINTS = 5;
  private readonly SAMPLE_SIZE = 32;
  private readonly CIRCLE_THRESHOLD = 0.7;

  startGesture(x: number, y: number): void {
    this.isDrawing = true;
    this.currentPath = [new Point(x, y)];
  }

  addPoint(x: number, y: number): void {
    if (!this.isDrawing) return;
    
    const lastPoint = this.currentPath[this.currentPath.length - 1];
    if (!lastPoint) return; // ✅ Guard clause
    
    const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    
    if (distance > 3) {
      this.currentPath.push(new Point(x, y));
    }
  }

  recognizeGesture(): GestureResult {
    this.isDrawing = false;
    
    if (this.currentPath.length < this.MIN_POINTS) {
      return { type: GestureType.NONE, confidence: 0, path: [] };
    }

    const normalized = this.resample(this.currentPath, this.SAMPLE_SIZE);
    
    const scores = [
      { type: GestureType.CIRCLE, score: this.testCircle(normalized) },
      { type: GestureType.ZIGZAG, score: this.testZigzag(normalized) },
      { type: GestureType.TRIANGLE, score: this.testTriangle(normalized) },
      { type: GestureType.HORIZONTAL_SLASH, score: this.testHorizontalSlash(normalized) },
      { type: GestureType.VERTICAL_LINE, score: this.testVerticalLine(normalized) }
    ];

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    // ✅ Safe check
    if (!best || best.score < 0.5) {
      return { type: GestureType.NONE, confidence: 0, path: this.currentPath };
    }

    return {
      type: best.type,
      confidence: best.score,
      path: this.currentPath
    };
  }

  reset(): void {
    this.currentPath = [];
    this.isDrawing = false;
  }

  getCurrentPath(): Point[] {
    return [...this.currentPath];
  }

  // ==================== ALGORITMOS ====================

  private resample(points: Point[], n: number): Point[] {
    const length = this.pathLength(points);
    const interval = length / (n - 1);
    const resampled: Point[] = [points[0]!]; // ✅ Non-null assertion (safe after length check)
    
    let distance = 0;
    
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];
      
      // ✅ Guard clauses
      if (!curr || !prev) continue;
      
      const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      
      if (distance + d >= interval) {
        const ratio = (interval - distance) / d;
        const newPoint = new Point(
          prev.x + ratio * (curr.x - prev.x),
          prev.y + ratio * (curr.y - prev.y)
        );
        resampled.push(newPoint);
        points.splice(i, 0, newPoint);
        distance = 0;
      } else {
        distance += d;
      }
    }
    
    const lastPoint = points[points.length - 1];
    if (resampled.length === n - 1 && lastPoint) {
      resampled.push(lastPoint);
    }
    
    return resampled;
  }

  private pathLength(points: Point[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];
      if (!curr || !prev) continue; // ✅ Guard
      length += Math.hypot(curr.x - prev.x, curr.y - prev.y);
    }
    return length;
  }

  private testCircle(points: Point[]): number {
    if (points.length === 0) return 0;

    const center = points.reduce(
      (acc, p) => ({ x: acc.x + p.x / points.length, y: acc.y + p.y / points.length }),
      { x: 0, y: 0 }
    );

    const avgRadius = points.reduce(
      (sum, p) => sum + Math.hypot(p.x - center.x, p.y - center.y),
      0
    ) / points.length;

    const radiusVariance = points.reduce(
      (sum, p) => {
        const r = Math.hypot(p.x - center.x, p.y - center.y);
        return sum + Math.pow(r - avgRadius, 2);
      },
      0
    ) / points.length;

    const first = points[0];
    const last = points[points.length - 1];
    
    // ✅ Safe check
    if (!first || !last) return 0;

    const closure = Math.hypot(first.x - last.x, first.y - last.y);

    const varianceScore = Math.max(0, 1 - radiusVariance / (avgRadius * avgRadius));
    const closureScore = Math.max(0, 1 - closure / (avgRadius * 2));

    return (varianceScore * 0.7 + closureScore * 0.3);
  }

  private testZigzag(points: Point[]): number {
    if (points.length < 6) return 0;

    let directionChanges = 0;
    let prevDirection = 0;

    for (let i = 2; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];
      
      if (!curr || !prev) continue; // ✅ Guard
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const direction = Math.atan2(dy, dx);

      if (i > 2) {
        const angleDiff = Math.abs(direction - prevDirection);
        if (angleDiff > Math.PI / 4) {
          directionChanges++;
        }
      }

      prevDirection = direction;
    }

    const minChanges = 3;
    if (directionChanges < minChanges) return 0;

    return Math.min(1, directionChanges / (points.length * 0.3));
  }

  private testTriangle(points: Point[]): number {
    const corners: Point[] = [];
    const threshold = Math.PI / 3;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      if (!prev || !curr || !next) continue; // ✅ Guard
      
      const angle = this.angleBetween(prev, curr, next);
      
      if (Math.abs(angle) > threshold) {
        corners.push(curr);
      }
    }

    if (corners.length < 2 || corners.length > 4) return 0;

    const first = points[0];
    const last = points[points.length - 1];
    
    if (!first || !last) return 0; // ✅ Guard

    const closure = Math.hypot(first.x - last.x, first.y - last.y);
    const avgDist = this.pathLength(points) / points.length;
    const closureScore = Math.max(0, 1 - closure / avgDist);

    return closureScore * 0.8;
  }

  private testHorizontalSlash(points: Point[]): number {
    const bounds = this.getBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    if (width < height * 1.5) return 0;

    let horizontalMovement = 0;
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];
      if (!curr || !prev) continue; // ✅ Guard
      horizontalMovement += Math.abs(curr.x - prev.x);
    }

    const totalMovement = this.pathLength(points);
    return totalMovement > 0 ? horizontalMovement / totalMovement : 0;
  }

  private testVerticalLine(points: Point[]): number {
    const bounds = this.getBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    if (height < width * 1.5) return 0;

    let verticalMovement = 0;
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];
      if (!curr || !prev) continue; // ✅ Guard
      verticalMovement += Math.abs(curr.y - prev.y);
    }

    const totalMovement = this.pathLength(points);
    return totalMovement > 0 ? verticalMovement / totalMovement : 0;
  }

  // ==================== HELPERS ====================

  private angleBetween(p1: Point, p2: Point, p3: Point): number {
    const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    return angle2 - angle1;
  }

  private getBounds(points: Point[]) {
    return {
      minX: Math.min(...points.map(p => p.x)),
      maxX: Math.max(...points.map(p => p.x)),
      minY: Math.min(...points.map(p => p.y)),
      maxY: Math.max(...points.map(p => p.y))
    };
  }
}