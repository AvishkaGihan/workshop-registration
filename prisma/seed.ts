import { PrismaClient, type Role, type WorkshopStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD ?? "Workshop123!";

const daysFromNow = (days: number, hourUtc: number, minute = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hourUtc, minute, 0, 0);
  return d;
};

const PEOPLE = [
  "Maya Perera", "Daniel Fernando", "Priya Nair", "Tom Becker", "Aisha Khan", "Lucas Silva",
  "Hannah Cole", "Omar Haddad", "Grace Liu", "Noah Evans", "Sofia Romero", "Ethan Brooks",
];

type Attendee = { name: string; email: string; cancelled?: boolean; reason?: string };

const attendees = (count: number): Attendee[] =>
  Array.from({ length: count }, (_, i) => {
    const name = PEOPLE[i % PEOPLE.length];
    const suffix = i >= PEOPLE.length ? String(i) : "";
    return { name, email: `${name.toLowerCase().replace(/ /g, ".")}${suffix}@example.com` };
  });

type SeedWorkshop = {
  code: string;
  title: string;
  instructor: string;
  location: string;
  description: string;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  status: WorkshopStatus;
  attendees: Attendee[];
};

async function upsertUser(name: string, email: string, role: Role, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, role, passwordHash },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await upsertUser("Alex Admin", "admin@example.com", "admin", passwordHash);
  const manager = await upsertUser("Morgan Manager", "manager@example.com", "manager", passwordHash);
  const staff = await upsertUser("Sam Staff", "staff@example.com", "staff", passwordHash);

  if ((await prisma.workshop.count()) > 0) {
    console.log("Workshops already exist, so sample data was skipped.");
    return;
  }

  const workshops: SeedWorkshop[] = [
    {
      code: "POT-101", title: "Intro to Pottery", instructor: "Rina Costa", location: "Riverside Centre",
      description: "Hands-on wheel basics. Aprons and clay provided.",
      startsAt: daysFromNow(1, 10), durationMinutes: 120, capacity: 12, status: "open",
      attendees: [
        ...attendees(3),
        { name: "Tom Becker", email: "tom.becker@example.com", cancelled: true, reason: "Clashes with a work shift" },
      ],
    },
    {
      code: "PHO-201", title: "Digital Photography Basics", instructor: "Jamal Reid", location: "Hillcrest Centre",
      description: "Bring your own camera or phone. We cover light, framing and editing.",
      startsAt: daysFromNow(2, 14), durationMinutes: 90, capacity: 10, status: "open",
      attendees: attendees(9), // one seat left
    },
    {
      code: "BRD-110", title: "Weekend Bread Baking", instructor: "Elena Marsh", location: "Harbour Centre",
      description: "Knead, shape and bake your own loaf to take home.",
      startsAt: daysFromNow(3, 9), durationMinutes: 180, capacity: 8, status: "open",
      attendees: attendees(8), // full
    },
    {
      code: "CPT-100", title: "Computer Skills for Beginners", instructor: "Dev Patel", location: "Riverside Centre",
      description: "Email, web browsing and staying safe online.",
      startsAt: daysFromNow(4, 11), durationMinutes: 120, capacity: 20, status: "open",
      attendees: attendees(6),
    },
    {
      code: "GRD-150", title: "Community Gardening", instructor: "Fiona Walsh", location: "Hillcrest Centre",
      description: "Planning the spring planting. Not published yet.",
      startsAt: daysFromNow(9, 10), durationMinutes: 90, capacity: 15, status: "draft",
      attendees: [],
    },
    {
      code: "WRT-120", title: "Creative Writing Circle", instructor: "Hugo Bell", location: "Harbour Centre",
      description: "A friendly circle for sharing short pieces.",
      startsAt: daysFromNow(10, 17), durationMinutes: 90, capacity: 14, status: "open",
      attendees: attendees(2),
    },
    {
      code: "SEW-101", title: "Sewing Basics", instructor: "Mina Okafor", location: "Riverside Centre",
      description: "Last week's class. Kept for the record.",
      startsAt: daysFromNow(-6, 10), durationMinutes: 120, capacity: 10, status: "completed",
      attendees: attendees(8),
    },
    {
      code: "FIN-130", title: "Budgeting Made Simple", instructor: "Carl Dunn", location: "Harbour Centre",
      description: "Cancelled because the instructor is unwell.",
      startsAt: daysFromNow(6, 13), durationMinutes: 60, capacity: 16, status: "cancelled",
      attendees: [],
    },
  ];

  for (const { attendees: list, ...data } of workshops) {
    const activeCount = list.filter((a) => !a.cancelled).length;
    const workshop = await prisma.workshop.create({
      data: { ...data, activeCount, createdById: manager.id, updatedById: manager.id },
    });
    for (const a of list) {
      await prisma.registration.create({
        data: {
          workshopId: workshop.id,
          attendeeName: a.name,
          attendeeEmail: a.email,
          status: a.cancelled ? "cancelled" : "active",
          registeredById: staff.id,
          ...(a.cancelled
            ? { cancelledById: staff.id, cancelledAt: new Date(), cancelReason: a.reason ?? null }
            : {}),
        },
      });
    }
  }

  console.log(`Seeded users and ${workshops.length} workshops. Dev password for all three accounts: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());