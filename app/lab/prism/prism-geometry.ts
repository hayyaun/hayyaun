import { BufferGeometry, Float32BufferAttribute, Shape } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Rounded triangular solid with an offset front face and three broad curved side faces. */
export function createPrismGeometry() {
  const outline = new Shape();
  outline.moveTo(-1.24,-.92);
  outline.bezierCurveTo(-1.52,-.87,-1.46,-.66,-1.30,-.36);
  outline.bezierCurveTo(-.91,.35,-.42,1.19,-.18,1.48);
  outline.bezierCurveTo(-.05,1.64,.09,1.63,.22,1.42);
  outline.bezierCurveTo(.57,.88,1.14,-.12,1.40,-.64);
  outline.bezierCurveTo(1.57,-.98,1.25,-1.18,.91,-1.19);
  outline.bezierCurveTo(.12,-1.24,-.85,-1.06,-1.24,-.92);
  const count=192;
  const contour=outline.getSpacedPoints(count).slice(0,count);
  // Each layer is a cross-section of the entire solid, not a ridge on a flat plate.
  const profiles: {s:number;z:number;x:number;y:number}[]=[];
  const frontScale=.70;
  for(let i=0;i<=24;i++){
    const t=i/24;
    profiles.push({s:frontScale*t,z:.12-.015*t*t,x:.16*t,y:.32*t});
  }
  for(let i=1;i<=24;i++){
    const t=i/24, a=t*Math.PI/2;
    profiles.push({s:frontScale+(1-frontScale)*Math.sin(a),z:.105+.26*Math.sin(a*2)-.30*(1-Math.cos(a)),x:.16*Math.cos(a),y:.32*Math.cos(a)});
  }
  for(let i=1;i<=24;i++){
    const t=i/24,a=t*Math.PI/2;
    profiles.push({s:1-.14*(1-Math.cos(a)),z:-.185-.42*Math.sin(a),x:-.06*Math.sin(a),y:-.025*Math.sin(a)});
  }
  for(let i=1;i<=24;i++){
    const t=1-i/24;
    profiles.push({s:.86*t,z:-.605-.035*(1-t*t),x:-.06*t,y:-.025*t});
  }
  const positions:number[]=[], indices:number[]=[];
  profiles.forEach((layer)=>{
    contour.forEach(p=>{
      const x=p.x*layer.s+layer.x, y=(p.y-.14)*layer.s+layer.y;
      const bow=.025*x*y;
      positions.push(x,y,layer.z+bow);
    });
  });
  for(let k=0;k<profiles.length-1;k++)for(let j=0;j<count;j++){
    const a=k*count+j,b=k*count+(j+1)%count,c=a+count,d=b+count;
    indices.push(a,b,c,b,d,c);
  }
  const source=new BufferGeometry();
  source.setAttribute('position',new Float32BufferAttribute(positions,3));
  source.setIndex(indices);
  // Weld poles and seams before generating normals.
  const geometry=mergeVertices(source,.00001);
  const idx=geometry.getIndex()!,faces:number[]=[];
  for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);if(a!==b&&b!==c&&c!==a)faces.push(a,b,c);}
  geometry.setIndex(faces);
  geometry.computeVertexNormals();geometry.computeBoundingSphere();source.dispose();
  return geometry;
}
