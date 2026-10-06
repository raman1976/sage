// Sage stationary robot pan/tilt - PARAMETRIC EDITABLE CAD
// Prototype geometry for Hiwonder HPS-2527MG-class standard servos + Qi2 puck.
// VERIFY your physical servo and charger dimensions before final print.
$fn=72;
part="assembly"; // assembly | pan_base | tilt_yoke | phone_plate

// ---- editable parameters (mm) ----
servo_L=40.5; servo_W=20.5; servo_H=40.5; // body envelope, intentionally adjustable
servo_clear=0.7;
wall=4; base_W=120; base_D=80; base_T=6;
yoke_inside=44; yoke_wall=5; yoke_H=62; yoke_T=6;
phone_W=85; phone_H=60; phone_T=5;
qi2_D=60; qi2_depth=4.0; cable_W=10;
mount_hole_D=3.4;

module rounded_box(x,y,z,r=5){
 hull(){for(ix=[-1,1],iy=[-1,1]) translate([ix*(x/2-r),iy*(y/2-r),0]) cylinder(h=z,r=r);}
}
module servo_body(clear=0){ cube([servo_L+2*clear,servo_W+2*clear,servo_H+2*clear],center=true); }

module pan_base(){
 difference(){
  rounded_box(base_W,base_D,base_T,8);
  // cable pass-through
  translate([0,0,-1]) cylinder(h=base_T+2,d=32);
  // base mounting holes
  for(x=[-50,50],y=[-30,30]) translate([x,y,-1]) cylinder(h=base_T+2,d=mount_hole_D);
 }
 // pan servo cradle (standard servo envelope, vertical shaft)
 translate([0,0,base_T]) difference(){
   rounded_box(servo_W+2*wall+2,servo_L+2*wall+2,servo_H*0.55,4);
   translate([0,0,wall]) rotate([0,0,90]) servo_body(servo_clear);
   translate([0,0,-1]) cube([cable_W,servo_L+10,servo_H],center=true);
 }
}

module tilt_yoke(){
 // bottom bridge
 translate([0,0,yoke_T/2]) rounded_box(yoke_inside+2*yoke_wall,servo_L+10,yoke_T,5);
 // side cheeks
 for(x=[-(yoke_inside/2+yoke_wall/2),(yoke_inside/2+yoke_wall/2)])
  translate([x,0,yoke_H/2]) difference(){
   rounded_box(yoke_wall,servo_L+10,yoke_H,3);
   // axle/horn clearance near top
   translate([0,0,yoke_H*0.27]) rotate([0,90,0]) cylinder(h=yoke_wall+2,d=10,center=true);
  }
 // tilt servo support block / pocket
 translate([0,0,22]) difference(){
  rounded_box(yoke_inside,servo_L+2*wall,servo_W+2*wall,4);
  rotate([90,0,0]) servo_body(servo_clear);
 }
 // central cable channel
 translate([0,0,8]) cube([cable_W,servo_L+16,16],center=true);
}

module phone_plate(){
 difference(){
  rounded_box(phone_W,phone_H,phone_T,7);
  // Qi2 puck recess on phone side
  translate([0,0,phone_T-qi2_depth]) cylinder(h=qi2_depth+1,d=qi2_D+0.6);
  // charging cable exit
  translate([0,-phone_H/2+8,-1]) cube([cable_W,18,phone_T+2],center=true);
  // optional M3 mounting pattern
  for(x=[-32,32],y=[-20,20]) translate([x,y,-1]) cylinder(h=phone_T+2,d=mount_hole_D);
 }
 // rear tilt attachment boss
 translate([0,0,-8]) difference(){ cylinder(h=8,d=32); translate([0,0,-1]) cylinder(h=10,d=5); }
}

module assembly(){
 color("ivory") pan_base();
 translate([0,0,base_T+servo_H*0.55]) color("gainsboro") tilt_yoke();
 translate([0,0,base_T+servo_H*0.55+yoke_H+15]) rotate([90,0,0]) color("white") phone_plate();
}

if(part=="pan_base") pan_base();
else if(part=="tilt_yoke") tilt_yoke();
else if(part=="phone_plate") phone_plate();
else assembly();
