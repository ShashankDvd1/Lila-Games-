declare module 'simpleheat' {
  interface SimpleHeat {
    data(data: (number[])[]): SimpleHeat;
    max(max: number): SimpleHeat;
    add(point: number[]): SimpleHeat;
    clear(): SimpleHeat;
    radius(r: number, blur?: number): SimpleHeat;
    gradient(grad: Record<number | string, string>): SimpleHeat;
    draw(minOpacity?: number): SimpleHeat;
  }
  function simpleheat(canvas: HTMLCanvasElement | string): SimpleHeat;
  export default simpleheat;
}
