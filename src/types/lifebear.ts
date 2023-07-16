// https://web.lifebear.com/Calendar/GetCalendarEvents?from=2023-07-31&to=2023-09-03
export type GetCalendarListJson = {
  lifebearCalendars: {
    id: string;
    name: string;
    color: string;
    isVisible: boolean;
    position: number;
    canEditName: boolean;
    canDelete: boolean;
  }[];
  readOnlyCalendars: [{ id: string; name: string; color: string; isVisible: boolean }];
  projects: {
    id: string;
    name: string;
    color: string;
    isVisible: false;
    isRestricted: false;
  }[];
  projectLabels: { id: string; name: string; color: string; isVisible: boolean }[];
};

// https://web.lifebear.com/Calendar/GetCalendarEvents?from=2023-06-26&to=2023-08-06
export type GetCalendarEventsJson = {
  inboxLabelColor: string;
  scheduleEvents: {
    scheduleFamilyId: {
      value: string;
      type: "normal" | "anomaly" | "routine";
      repeatOrder: number;
    };
    position: 2;
    calendarLabelDefinitionId: string;
    color: string;
    isAllday: false;
    startDate: string;
    startTime: string | null;
    endDate: string;
    endTime: string | null;
    title: string;
  }[];
  readOnlyScheduleEvents: {
    readOnlyScheduleId: string;
    color: string;
    isAllday: true;
    startDate: string;
    startTime: string | null;
    endDate: string;
    endTime: string | null;
    title: string;
  }[];
  taskEvents: any[];
};

// https://web.lifebear.com/Calendar/GetScheduleDetail?scheduleId=21919617172
export type GetScheduleDetailJson = {
  scheduleId: string;
  title: string;
  location: string;
  startsAt: string;
  endsAt: string;
  isAllday: boolean;
  comment: string;
  labelId: string;
};

type RoutineRepeat =
  | {
      type: "daily";
      interval: number;
    }
  | {
      type: "weekly";
      interval: number;
      dayOfWeeks: ("sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday")[];
    }
  | {
      type: "monthlyDay";
      interval: number;
      day: number;
    }
  | {
      type: "yearly";
      interval: number;
      month: number;
      day: number;
    };

type Routine = {
  repeat: RoutineRepeat;
  finish: null;
};

// https://web.lifebear.com/Calendar/GetRoutineScheduleDetail?routineId=21544736461&repeatOrder=17
export type GetRoutineScheduleDetailJson = {
  routineId: string;
  repeatOrder: number;
  title: string;
  location: string;
  startsAt: string;
  endsAt: string;
  isAllday: boolean;
  comment: string;
  routine: Routine;
  labelId: string;
};

// https://web.lifebear.com/Calendar/GetAnomalyScheduleDetail?anomalyRoutineId=21227594853
export type GetAnomalyScheduleDetailJson = {
  anomalyRoutineId: string;
  title: string;
  location: string;
  startsAt: string;
  endsAt: string;
  isAllday: boolean;
  comment: string;
  routine: Routine;
  labelId: string;
  isIndependent: boolean;
};
