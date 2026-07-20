import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/utils";

export async function getCustomerProfileByUserId(userId: bigint) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { persona: { include: { reclamos: { orderBy: { created_at: "desc" } } } } },
  });
  if (!usuario) return null;

  const [pasajes, encomiendas] = await Promise.all([
    prisma.pasaje.findMany({
      where: { OR: [{ comprador_id: usuario.id }, { persona_id: usuario.persona_id }] },
      include: {
        pasajero: true,
        asiento_viaje: { include: { viaje: { include: { ruta: { include: { origen: true, destino: true } }, bus: true } } } },
      },
      orderBy: { fecha_compra: "desc" },
    }),
    prisma.encomienda.findMany({
      where: { OR: [{ remitente_id: usuario.persona_id }, { destinatario_id: usuario.persona_id }] },
      include: {
        remitente: true,
        destinatario: true,
        origen: true,
        destino: true,
        viaje: { include: { ruta: { include: { origen: true, destino: true } } } },
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const { contrasena: _contrasena, ...usuarioSeguro } = usuario;
  return serializeBigInt({
    ...usuarioSeguro,
    pasajes: pasajes.map((pasaje) => ({
      ...pasaje,
      nombres: pasaje.pasajero.nombres,
      apellidos: pasaje.pasajero.apellidos,
      dni: pasaje.pasajero.dni,
    })),
    encomiendas,
  });
}