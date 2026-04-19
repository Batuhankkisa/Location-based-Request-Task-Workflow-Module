import { PrismaClient, LocationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hospital = await prisma.location.upsert({
    where: { code: 'HOSPITAL_A' },
    update: {
      name: 'Hastane A',
      type: LocationType.ORGANIZATION,
      parentId: null
    },
    create: {
      name: 'Hastane A',
      code: 'HOSPITAL_A',
      type: LocationType.ORGANIZATION
    }
  });

  const thirdFloor = await prisma.location.upsert({
    where: { code: 'HOSPITAL_A_FLOOR_3' },
    update: {
      name: '3. Kat',
      type: LocationType.FLOOR,
      parentId: hospital.id
    },
    create: {
      name: '3. Kat',
      code: 'HOSPITAL_A_FLOOR_3',
      type: LocationType.FLOOR,
      parentId: hospital.id
    }
  });

  const room401 = await prisma.location.upsert({
    where: { code: 'HOSPITAL_A_FLOOR_3_ROOM_401' },
    update: {
      name: '401 No’lu Oda',
      type: LocationType.ROOM,
      parentId: thirdFloor.id
    },
    create: {
      name: '401 No’lu Oda',
      code: 'HOSPITAL_A_FLOOR_3_ROOM_401',
      type: LocationType.ROOM,
      parentId: thirdFloor.id
    }
  });

  const room402 = await prisma.location.upsert({
    where: { code: 'HOSPITAL_A_FLOOR_3_ROOM_402' },
    update: {
      name: '402 No’lu Oda',
      type: LocationType.ROOM,
      parentId: thirdFloor.id
    },
    create: {
      name: '402 No’lu Oda',
      code: 'HOSPITAL_A_FLOOR_3_ROOM_402',
      type: LocationType.ROOM,
      parentId: thirdFloor.id
    }
  });

  await prisma.qrCode.upsert({
    where: { token: 'room-401-demo-token' },
    update: {
      label: 'QR - 401 No’lu Oda',
      isActive: true,
      locationId: room401.id
    },
    create: {
      token: 'room-401-demo-token',
      label: 'QR - 401 No’lu Oda',
      isActive: true,
      locationId: room401.id
    }
  });

  await prisma.qrCode.upsert({
    where: { token: 'room-402-demo-token' },
    update: {
      label: 'QR - 402 No’lu Oda',
      isActive: true,
      locationId: room402.id
    },
    create: {
      token: 'room-402-demo-token',
      label: 'QR - 402 No’lu Oda',
      isActive: true,
      locationId: room402.id
    }
  });

  console.log('Seed completed: Hastane A, 3. Kat, 401/402 No’lu Oda QR kayıtları hazır.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
