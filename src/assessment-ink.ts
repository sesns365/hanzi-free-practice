export type InkStroke = {points:number[][];width:number;tool?:'pen'|'eraser'};
export const ERASER_WIDTH=40;

// Replay on a transparent layer so erasing never removes the writing grid.
export function paintAssessmentInk(ctx:CanvasRenderingContext2D,strokes:InkStroke[]){
 ctx.save();ctx.clearRect(0,0,600,600);ctx.lineCap='round';ctx.lineJoin='round';
 for(const stroke of strokes){
  if(!stroke.points.length)continue;
  ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';
  ctx.strokeStyle='#183f86';ctx.lineWidth=stroke.width;ctx.beginPath();
  ctx.moveTo(stroke.points[0][0],stroke.points[0][1]);
  for(const p of stroke.points.slice(1))ctx.lineTo(p[0],p[1]);
  if(stroke.points.length===1)ctx.lineTo(stroke.points[0][0]+.1,stroke.points[0][1]+.1);
  ctx.stroke();
 }
 ctx.restore();
}

// 書寫時只畫新增的一小段，不必每次移動都整張重畫；放開筆後仍會整張重畫一次，結果相同。
export function paintInkSegment(ctx:CanvasRenderingContext2D,from:number[],to:number[],stroke:{width:number;tool?:string}){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';
 ctx.strokeStyle='#183f86';ctx.lineWidth=stroke.width;ctx.beginPath();ctx.moveTo(from[0],from[1]);ctx.lineTo(to[0],to[1]);ctx.stroke();
 ctx.restore();
}

export function inkHasMarks(canvas:HTMLCanvasElement){
 const pixels=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
 for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)return true;
 return false;
}

// 老師批改時用紅筆在學生字跡上圈寫的筆跡，存在該題 state.teacherInk，不會改動學生原本的字跡。
export const TEACHER_INK_COLOR='#dc2626';
export const TEACHER_INK_WIDTH=6;
export const TEACHER_INK_MAX_POINTS=6000;
export function teacherInkStrokes(state:any):InkStroke[]{
 const value=state?.teacherInk;
 if(!Array.isArray(value))return [];
 return value.filter((s:any)=>s&&Array.isArray(s.points)&&s.points.length&&s.points.every((p:any)=>Array.isArray(p)&&p.length===2&&p.every((n:any)=>Number.isFinite(n)))).map((s:any)=>({points:s.points,width:Number.isFinite(s.width)?s.width:TEACHER_INK_WIDTH}));
}
// 疊畫在既有畫面上（不清除底下的學生字跡）。
export function drawTeacherInk(ctx:CanvasRenderingContext2D,strokes:InkStroke[]){
 if(!strokes.length)return;
 ctx.save();ctx.globalCompositeOperation='source-over';ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=TEACHER_INK_COLOR;
 for(const stroke of strokes){
  if(!stroke.points.length)continue;
  ctx.lineWidth=stroke.width;ctx.beginPath();ctx.moveTo(stroke.points[0][0],stroke.points[0][1]);
  for(const p of stroke.points.slice(1))ctx.lineTo(p[0],p[1]);
  if(stroke.points.length===1)ctx.lineTo(stroke.points[0][0]+.1,stroke.points[0][1]+.1);
  ctx.stroke();
 }
 ctx.restore();
}
