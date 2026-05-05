import { hash } from 'bcryptjs';
import { LocationType, OrganizationType, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
const demoPassword = 'Admin123!';

type LocationSeed = {
  organizationId: string;
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

type OrganizationSeed = {
  code: string;
  name: string;
  type: OrganizationType;
  floors: number[];
  rooms: RoomSeed[];
};

const organizations: OrganizationSeed[] = [
  {
    code: 'HOSPITAL_A',
    name: 'Ozel Hastane A',
    type: OrganizationType.HOSPITAL,
    floors: [1, 2, 3, 4],
    rooms: [
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
    ]
  },
  {
    code: 'HOSPITAL_B',
    name: 'Ozel Hastane B',
    type: OrganizationType.HOSPITAL,
    floors: [1, 2, 3],
    rooms: [
      { floor: 1, room: '101', token: 'hsp-b-f1-r101-demo' },
      { floor: 1, room: '102', token: 'hsp-b-f1-r102-demo' },
      { floor: 2, room: '201', token: 'hsp-b-f2-r201-demo' },
      { floor: 2, room: '202', token: 'hsp-b-f2-r202-demo' },
      { floor: 3, room: '301', token: 'hsp-b-f3-r301-demo' },
      { floor: 3, room: '302', token: 'hsp-b-f3-r302-demo' }
    ]
  }
];

const demoUsers = [
  {
    email: 'admin@example.com',
    fullName: 'Demo Admin',
    role: Role.ADMIN,
    organizationCode: null
  },
  {
    email: 'supervisor.a@example.com',
    fullName: 'Hastane A Supervisor',
    role: Role.SUPERVISOR,
    organizationCode: 'HOSPITAL_A'
  },
  {
    email: 'staff.a@example.com',
    fullName: 'Hastane A Staff',
    role: Role.STAFF,
    organizationCode: 'HOSPITAL_A'
  },
  {
    email: 'supervisor.b@example.com',
    fullName: 'Hastane B Supervisor',
    role: Role.SUPERVISOR,
    organizationCode: 'HOSPITAL_B'
  },
  {
    email: 'staff.b@example.com',
    fullName: 'Hastane B Staff',
    role: Role.STAFF,
    organizationCode: 'HOSPITAL_B'
  }
] as const;

function floorCode(organizationCode: string, floor: number) {
  return `${organizationCode}_FLOOR_${floor}`;
}

function roomCode(organizationCode: string, floor: number, room: string) {
  return `${floorCode(organizationCode, floor)}_ROOM_${room}`;
}

async function upsertOrganization(seed: OrganizationSeed) {
  return prisma.organization.upsert({
    where: { code: seed.code },
    update: {
      name: seed.name,
      type: seed.type,
      isActive: true
    },
    create: {
      code: seed.code,
      name: seed.name,
      type: seed.type,
      isActive: true
    }
  });
}

async function upsertLocation(seed: LocationSeed) {
  const codes = [seed.code, ...(seed.legacyCodes ?? [])];
  const existing = await prisma.location.findFirst({
    where: {
      organizationId: seed.organizationId,
      code: {
        in: codes
      }
    }
  });

  if (existing) {
    return prisma.location.update({
      where: { id: existing.id },
      data: {
        organizationId: seed.organizationId,
        code: seed.code,
        name: seed.name,
        parentId: seed.parentId,
        type: seed.type
      }
    });
  }

  return prisma.location.create({
    data: {
      organizationId: seed.organizationId,
      code: seed.code,
      name: seed.name,
      parentId: seed.parentId,
      type: seed.type
    }
  });
}

async function upsertRootLocation(organization: { id: string; code: string; name: string }) {
  return upsertLocation({
    organizationId: organization.id,
    code: organization.code,
    name: organization.name,
    parentId: null,
    type: LocationType.ORGANIZATION
  });
}

async function upsertQrCode(input: {
  label: string;
  locationId: string;
  token: string;
  note: string;
}) {
  return prisma.qrCode.upsert({
    where: { token: input.token },
    update: {
      imagePath: null,
      label: input.label,
      isActive: true,
      deactivatedAt: null,
      locationId: input.locationId,
      note: input.note
    },
    create: {
      token: input.token,
      imagePath: null,
      label: input.label,
      isActive: true,
      locationId: input.locationId,
      note: input.note
    }
  });
}

async function renameLegacyUsersIfNeeded() {
  const legacyToScoped = [
    ['supervisor@example.com', 'supervisor.a@example.com'],
    ['staff@example.com', 'staff.a@example.com']
  ] as const;

  for (const [legacyEmail, scopedEmail] of legacyToScoped) {
    const scopedUser = await prisma.user.findUnique({ where: { email: scopedEmail } });
    if (scopedUser) {
      continue;
    }

    const legacyUser = await prisma.user.findUnique({ where: { email: legacyEmail } });
    if (!legacyUser) {
      continue;
    }

    await prisma.user.update({
      where: { email: legacyEmail },
      data: {
        email: scopedEmail
      }
    });
  }
}

async function upsertDemoUsers(organizationByCode: Map<string, { id: string; name: string }>) {
  const passwordHash = await hash(demoPassword, 10);

  await renameLegacyUsersIfNeeded();

  for (const user of demoUsers) {
    const organizationId = user.organizationCode
      ? organizationByCode.get(user.organizationCode)?.id ?? null
      : null;

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        isActive: true,
        passwordHash,
        role: user.role,
        organizationId
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        isActive: true,
        passwordHash,
        role: user.role,
        organizationId
      }
    });
  }
}

async function seedOrganization(organizationSeed: OrganizationSeed) {
  const organization = await upsertOrganization(organizationSeed);
  const rootLocation = await upsertRootLocation(organization);
  const floors = new Map<number, { id: string }>();

  for (const floor of organizationSeed.floors) {
    const location = await upsertLocation({
      organizationId: organization.id,
      code: floorCode(organizationSeed.code, floor),
      name: `${floor}. Kat`,
      parentId: rootLocation.id,
      type: LocationType.FLOOR
    });

    floors.set(floor, location);
  }

  const summary: Array<{ floor: number; room: string; token: string }> = [];

  for (const item of organizationSeed.rooms) {
    const floor = floors.get(item.floor);
    if (!floor) {
      throw new Error(`Floor ${item.floor} is not defined for ${organizationSeed.code}`);
    }

    const room = await upsertLocation({
      organizationId: organization.id,
      code: roomCode(organizationSeed.code, item.floor, item.room),
      legacyCodes: item.legacyCodes,
      name: `${item.room} No'lu Oda`,
      parentId: floor.id,
      type: LocationType.ROOM
    });

    await upsertQrCode({
      token: item.token,
      label: `${organizationSeed.name} - ${item.room} No'lu Oda`,
      locationId: room.id,
      note: `${organizationSeed.name} demo QR kaydı`
    });

    summary.push({
      floor: item.floor,
      room: item.room,
      token: item.token
    });
  }

  return {
    organization,
    summary
  };
}

async function main() {
  const organizationByCode = new Map<string, { id: string; name: string }>();
  const summaries: Array<{
    organizationName: string;
    rooms: Array<{ floor: number; room: string; token: string }>;
  }> = [];

  for (const organizationSeed of organizations) {
    const result = await seedOrganization(organizationSeed);
    organizationByCode.set(organizationSeed.code, {
      id: result.organization.id,
      name: result.organization.name
    });
    summaries.push({
      organizationName: result.organization.name,
      rooms: result.summary
    });
  }

  await upsertDemoUsers(organizationByCode);

  console.log('Multi-organization demo seed completed.');
  console.log('Demo users:');
  for (const user of demoUsers) {
    const organizationName = user.organizationCode
      ? organizationByCode.get(user.organizationCode)?.name ?? user.organizationCode
      : 'Global';
    console.log(`- ${user.email} / ${demoPassword} (${user.role} - ${organizationName})`);
  }

  console.log('Test URLs:');
  for (const organizationSummary of summaries) {
    console.log(`- ${organizationSummary.organizationName}`);
    for (const item of organizationSummary.rooms) {
      console.log(`  • Floor ${item.floor} / Room ${item.room}: http://localhost:3000/q/${item.token}`);
    }
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
