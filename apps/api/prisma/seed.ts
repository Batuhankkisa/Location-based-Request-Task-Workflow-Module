import { PrismaClient, LocationType } from '@prisma/client';

const prisma = new PrismaClient();

type LocationSeed = {
  code: string;
  legacyCodes?: string[];
  name: string;
  parentId: string | null;
  type: LocationType;
};

type RoomSeed = {
  floor: number;
  room: string;
  token: string;
  legacyCodes?: string[];
};

const hospital = {
  code: 'HOSPITAL_A',
  name: 'Özel Hastane A'
};

const floorNumbers = [1, 2, 3, 4];

const rooms: RoomSeed[] = [
  { floor: 1, room: '101', token: 'hsp-a-f1-r101-demo' },
  { floor: 1, room: '102', token: 'hsp-a-f1-r102-demo' },
  { floor: 1, room: '103', token: 'hsp-a-f1-r103-demo' },
  { floor: 2, room: '201', token: 'hsp-a-f2-r201-demo' },
  { floor: 2, room: '202', token: 'hsp-a-f2-r202-demo' },
  { floor: 2, room: '203', token: 'hsp-a-f2-r203-demo' },
  { floor: 3, room: '301', token: 'hsp-a-f3-r301-demo' },
  { floor: 3, room: '302', token: 'hsp-a-f3-r302-demo' },
  { floor: 3, room: '303', token: 'hsp-a-f3-r303-demo' },
  {
    floor: 4,
    room: '401',
    token: 'room-401-demo-token',
    legacyCodes: ['HOSPITAL_A_FLOOR_3_ROOM_401']
  },
  {
    floor: 4,
    room: '402',
    token: 'room-402-demo-token',
    legacyCodes: ['HOSPITAL_A_FLOOR_3_ROOM_402']
  }
];

function floorCode(floor: number) {
  return `${hospital.code}_FLOOR_${floor}`;
}

function roomCode(floor: number, room: string) {
  return `${floorCode(floor)}_ROOM_${room}`;
}

async function upsertLocation(seed: LocationSeed) {
  const codes = [seed.code, ...(seed.legacyCodes ?? [])];
  const existing = await prisma.location.findFirst({
    where: {
      code: {
        in: codes
      }
    }
  });

  if (existing) {
    return prisma.location.update({
      where: { id: existing.id },
      data: {
        code: seed.code,
        name: seed.name,
        parentId: seed.parentId,
        type: seed.type
      }
    });
  }

  return prisma.location.create({
    data: {
      code: seed.code,
      name: seed.name,
      parentId: seed.parentId,
      type: seed.type
    }
  });
}

async function upsertQrCode(input: { label: string; locationId: string; token: string }) {
  return prisma.qrCode.upsert({
    where: { token: input.token },
    update: {
      imagePath: `/qr-assets/${input.token}.png`,
      label: input.label,
      isActive: true,
      deactivatedAt: null,
      locationId: input.locationId,
      note: 'Demo hastane QR kaydı'
    },
    create: {
      token: input.token,
      imagePath: `/qr-assets/${input.token}.png`,
      label: input.label,
      isActive: true,
      locationId: input.locationId,
      note: 'Demo hastane QR kaydı'
    }
  });
}

async function main() {
  const root = await upsertLocation({
    code: hospital.code,
    name: hospital.name,
    parentId: null,
    type: LocationType.ORGANIZATION
  });

  const floors = new Map<number, { id: string }>();

  for (const floor of floorNumbers) {
    const location = await upsertLocation({
      code: floorCode(floor),
      name: `${floor}. Kat`,
      parentId: root.id,
      type: LocationType.FLOOR
    });

    floors.set(floor, location);
  }

  const summary: Array<{ floor: number; room: string; token: string }> = [];

  for (const item of rooms) {
    const floor = floors.get(item.floor);

    if (!floor) {
      throw new Error(`Floor ${item.floor} is not defined in seed data`);
    }

    const room = await upsertLocation({
      code: roomCode(item.floor, item.room),
      legacyCodes: item.legacyCodes,
      name: `${item.room} No'lu Oda`,
      parentId: floor.id,
      type: LocationType.ROOM
    });

    await upsertQrCode({
      token: item.token,
      label: `QR - ${item.room} No'lu Oda`,
      locationId: room.id
    });

    summary.push({
      floor: item.floor,
      room: item.room,
      token: item.token
    });
  }

  console.log(`${hospital.name} seed completed: ${summary.length} oda QR kaydı hazır.`);
  console.log('Test URL örnekleri:');
  for (const item of summary) {
    console.log(`- ${item.floor}. Kat / ${item.room} No'lu Oda: http://localhost:3000/q/${item.token}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
