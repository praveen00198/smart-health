import { db } from "@/lib/db";
import {
  alerts,
  consumptionDaily,
  facilities,
  facilityDaily,
  medicines,
  notifications,
  stock,
  testAvailability,
  transferProposals,
} from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [
      facilitiesCount,
      medicinesCount,
      stockCount,
      consumptionCount,
      facilityDailyCount,
      testsCount,
      alertsCount,
      transfersCount,
      notificationsCount,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(facilities),
      db.select({ count: sql<number>`count(*)::int` }).from(medicines),
      db.select({ count: sql<number>`count(*)::int` }).from(stock),
      db.select({ count: sql<number>`count(*)::int` }).from(consumptionDaily),
      db.select({ count: sql<number>`count(*)::int` }).from(facilityDaily),
      db.select({ count: sql<number>`count(*)::int` }).from(testAvailability),
      db.select({ count: sql<number>`count(*)::int` }).from(alerts),
      db.select({ count: sql<number>`count(*)::int` }).from(transferProposals),
      db.select({ count: sql<number>`count(*)::int` }).from(notifications),
    ]);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      orm: "drizzle-orm",
      counts: {
        facilities: facilitiesCount[0]?.count ?? 0,
        medicines: medicinesCount[0]?.count ?? 0,
        stockRows: stockCount[0]?.count ?? 0,
        consumptionHistoryRows: consumptionCount[0]?.count ?? 0,
        facilityDailyRows: facilityDailyCount[0]?.count ?? 0,
        testAvailabilityRows: testsCount[0]?.count ?? 0,
        alerts: alertsCount[0]?.count ?? 0,
        transferProposals: transfersCount[0]?.count ?? 0,
        notifications: notificationsCount[0]?.count ?? 0,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string; cause?: { message?: string } };
    const message = err.cause?.message
      ? `${err.message || "Query failed"}: ${err.cause.message}`
      : err.message || "Failed to query database counts";
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: message,
      },
      { status: 500 }
    );
  }
}
