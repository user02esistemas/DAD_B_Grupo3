async function check() {
  const res = await fetch('https://dad-b-grupo3.vercel.app/bus_1.jpg');
  console.log('bus_1.jpg:', res.status);
  const res2 = await fetch('https://dad-b-grupo3.vercel.app/imagenes/bus.jpeg');
  console.log('imagenes/bus.jpeg:', res2.status);
}
check();
