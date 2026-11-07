export type ContractRequest = {
  courseId: string;
  learnerId: string;
  learnerDeadline: string;
  educatorEmail: string;
  html: string;
};

export function deadlineStatus(deadline: string, now: Date): "open" | "overdue" {
  return new Date(deadline).getTime() >= now.getTime() ? "open" : "overdue";
}

export function reportLine(input: ContractRequest, now: Date): string {
  return `${input.courseId} / ${input.learnerId}: ${deadlineStatus(input.learnerDeadline, now)}`;
}
