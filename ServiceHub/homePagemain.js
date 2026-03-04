(function(){

document.documentElement.classList.add("reveal-on");

function ASSET_BASE(){
const p = location.pathname.replaceAll("\\","/");
return p.includes("/ServiceHub/") ? "../assets/" : "assets/";
}

function asset(f){
return encodeURI(ASSET_BASE()+f);
}

const bg = document.getElementById("heroBgPhoto");

if(bg){

const slides=[
asset("servicehubone.jpg"),
asset("servicehubtwo.jpg"),
asset("servicehubthree.avif")
];

slides.forEach(s=>{
const img=new Image();
img.src=s;
});

let i=0;

function setBg(u){
bg.style.backgroundImage=`url("${u}")`;
}

function show(x){

bg.classList.add("is-fading");

setTimeout(()=>{
setBg(slides[x]);
requestAnimationFrame(()=>{
bg.classList.remove("is-fading");
});
},420);

}

setBg(slides[0]);

setInterval(()=>{
i=(i+1)%slides.length;
show(i);
},5200);

}

const els=document.querySelectorAll(".reveal");

if(els.length && "IntersectionObserver" in window){

const io=new IntersectionObserver((entries)=>{

entries.forEach(e=>{

if(e.isIntersecting){
e.target.classList.add("is-visible");
io.unobserve(e.target);
}

});

},{threshold:0.12});

els.forEach(el=>io.observe(el));

}

else{

document.querySelectorAll(".reveal")
.forEach(el=>el.classList.add("is-visible"));

}

})();