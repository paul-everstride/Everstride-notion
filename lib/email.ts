"use server";

// Demo stub — resend package not installed in demo environment

export async function sendPairingEmail(_opts: {
  to: string;
  athleteName: string;
  coachName?: string | null;
  teamName: string;
  pairingLink: string;
}): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
