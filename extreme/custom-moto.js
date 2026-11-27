/* WMK custom motorcycle geometry — MIT */
window.WMKCustomMoto={build(T,root,spec,paint,dark,glass,glow){
const V=(x,y,z)=>new T.Vector3(x,y,z), up=V(0,1,0), wheels=[];
const metal=new T.MeshStandardMaterial({color:0x667584,metalness:.7,roughness:.36}), rubber=new T.MeshStandardMaterial({color:0x11151b,roughness:.87}), suit=new T.MeshStandardMaterial({color:0x202731,roughness:.7});
const add=(g,m,x=0,y=0,z=0,parent=root)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o};
const ell=(x,y,z,a,b,c,m)=>{const o=add(new T.SphereGeometry(1,20,12),m,x,y,z);o.scale.set(a,b,c);return o};
const rod=(a,b,r,m)=>{a=V(...a);b=V(...b);const d=b.clone().sub(a),o=add(new T.CylinderGeometry(r,r,d.length(),12),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,d.normalize());return o};
// Cross sections [z, center height, half width, half height], with faceted elliptical contours.
function shell(sections,mat){const pos=[],idx=[],n=12;for(const [z,y,w,h] of sections)for(let j=0;j<n;j++){const a=j/n*Math.PI*2;pos.push(w*Math.cos(a),y+h*Math.sin(a),z)}for(let i=0;i<sections.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=a+n,d=b+n;idx.push(a,b,c,b,d,c)}for(let j=1;j<n-1;j++){idx.push(0,j+1,j);const a=(sections.length-1)*n;idx.push(a,a+j,a+j+1)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return add(g,mat)}
const hover=spec.design==='aero',red=spec.design==='inferno',orange=spec.design==='titan',rad=spec.wheelRadius||.62,wide=spec.tireWidth||.42,base=spec.wheelbase||2.65;
const zf=base/2,zr=-base/2;
if(!hover){for(const z of [zr,zf]){const group=new T.Group();root.add(group);group.position.set(0,rad,z);group.userData.radius=rad;wheels.push(group);
const tyre=add(new T.TorusGeometry(rad*.81,rad*.19,12,40),rubber,0,0,0,group);tyre.rotation.y=Math.PI/2;tyre.scale.z=wide/(rad*.38);
for(const x of [-wide*.43,wide*.43]){const rim=add(new T.TorusGeometry(rad*.66,.055,8,40),glow,x,0,0,group);rim.rotation.y=Math.PI/2;const inner=add(new T.TorusGeometry(rad*.55,.045,8,32),metal,x*.85,0,0,group);inner.rotation.y=Math.PI/2}
if(!red&&!orange){for(let k=0;k<7;k++){const a=k*Math.PI*2/7,o=add(new T.BoxGeometry(.075,rad*.61,.055),metal,0,Math.cos(a)*rad*.29,Math.sin(a)*rad*.29,group);o.rotation.x=a}const hub=add(new T.CylinderGeometry(rad*.18,rad*.18,wide*.8,16),metal,0,0,0,group);hub.rotation.z=Math.PI/2}
for(let k=0;k<24;k++){const a=k*Math.PI/12,o=add(new T.BoxGeometry(wide*.7,.025,.045),dark,0,Math.cos(a)*(rad-.008),Math.sin(a)*(rad-.008),group);o.rotation.x=a}
}}
const floor=hover?.62:rad*.95, seat=hover?1.12:rad+.53;
shell([[zr-.48,seat+.05,.11,.05],[zr-.2,seat,.34,.16],[-.6,seat-.15,.42,.24],[.1,floor+.24,.48,.30],[.72,seat-.03,.37,.28],[zf+.25,seat+.03,.18,.13]],paint);
shell([[-.95,floor,.20,.09],[-.5,floor-.1,.38,.17],[.42,floor-.06,.45,.18],[.9,floor+.13,.22,.12]],dark);
ell(0,seat+.13,-.58,.25,.095,.56,dark);
shell([[.18,seat+.1,.28,.22],[.65,seat+.33,.35,.28],[1.05,seat+.4,.27,.18],[zf+.35,seat+.18,.12,.07]],paint);
shell([[.48,seat+.48,.24,.06],[.88,seat+.65,.21,.055],[1.13,seat+.47,.19,.045]],glass);
for(const x of [-1,1]){
 rod([x*.25,floor+.1,zr],[x*.33,seat-.22,-.25],.075,metal);
 if(!hover){rod([x*.23,rad,zf],[x*.26,seat+.45,.72],.09,metal);rod([x*.24,rad+.2,zf-.1],[x*.32,seat-.13,.32],.055,paint)}
 ell(x*.30,floor+.22,-.08,.13,.20,.38,metal);ell(x*.40,floor+.21,-.05,.045,.13,.32,glow);
 ell(x*.19,seat+.20,zf+.26,.095,.085,.045,glow);
 rod([x*.32,seat-.08,-.4],[x*.38,seat+.03,zr-.12],.08,metal);
 if(hover){for(const z of [-1.12,1.18]){ell(x*.48,.48,z,.34,.17,.68,paint);ell(x*.48,.31,z,.27,.055,.52,glow);ell(x*.48,.5,z-.61,.19,.12,.035,glow)}}
 if(orange||red){ell(x*.33,rad+.43,zr+.1,.19,.19,.40,paint);ell(x*.33,rad+.38,zf,.17,.13,.46,dark)}
}
ell(0,seat+.08,zr-.42,.24,.065,.045,new T.MeshBasicMaterial({color:0xff193c}));
rod([-.46,seat+.48,.72],[.46,seat+.48,.72],.045,metal);
// Rider geometry remains attached to the motorcycle reference frame.
ell(0,seat+.21,-.57,.22,.19,.25,suit);const torso=ell(0,seat+.48,-.24,.26,.36,.20,suit);torso.rotation.x=.65;
ell(0,seat+.77,.12,.22,.23,.22,dark);ell(0,seat+.80,.29,.18,.10,.08,glow);
for(const x of [-1,1]){rod([x*.22,seat+.59,-.15],[x*.34,seat+.43,.32],.085,suit);rod([x*.34,seat+.43,.32],[x*.43,seat+.48,.72],.07,suit);rod([x*.20,seat+.17,-.58],[x*.35,seat-.08,.05],.10,suit);rod([x*.35,seat-.08,.05],[x*.29,floor+.06,-.43],.085,suit);ell(x*.29,floor+.04,-.35,.12,.08,.21,dark)}
root.userData.moto=true;root.userData.wheels=wheels;return root
}};