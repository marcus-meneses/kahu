import React from "react";
import { Container, Grid, Title, Text } from "@mantine/core";
import classes from "@components/schedulemonth/component.module.css";
import { TranslationKey } from "../../i18n/dictionaries";
import { useI18n } from "../../i18n/I18nContext";

interface ScheduleDay {
  date: string;
  events: {
    time: string;
    statusKey: "schedule.status.onTime" | "schedule.status.delayed" | "schedule.status.cancelled";
    eventKey: TranslationKey;
  }[];
}

const monthSchedule: ScheduleDay[] = [
  {
    date: "2024-12-30",
    events: [],
  },
  {
    date: "2024-12-31",
    events: [
      { time: "16:30", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.cancelled" },
    ],
  },
  {
    date: "2025-01-01",
    events: [
      { time: "16:30", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.cancelled" },
    ],
  },
  {
    date: "2025-01-02",
    events: [
      { time: "20:30", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.delayed" },
      { time: "08:00", eventKey: "schedule.event.brainstorming", statusKey: "schedule.status.cancelled" },
      { time: "12:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.onTime" },
    ],
  },
  {
    date: "2025-01-03",
    events: [
      {
        time: "09:00",
        eventKey: "schedule.event.workshopLong",
        statusKey: "schedule.status.onTime",
      },
      { time: "19:00", eventKey: "schedule.event.yogaClass", statusKey: "schedule.status.delayed" },
      { time: "17:30", eventKey: "schedule.event.lunchBreak", statusKey: "schedule.status.onTime" },
      { time: "09:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.onTime" },
      { time: "19:00", eventKey: "schedule.event.yogaClass", statusKey: "schedule.status.delayed" },
      { time: "17:30", eventKey: "schedule.event.lunchBreak", statusKey: "schedule.status.onTime" },
      { time: "09:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.onTime" },
      { time: "19:00", eventKey: "schedule.event.yogaClass", statusKey: "schedule.status.delayed" },
      { time: "17:30", eventKey: "schedule.event.lunchBreak", statusKey: "schedule.status.onTime" },
      { time: "09:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.onTime" },
      { time: "19:00", eventKey: "schedule.event.yogaClass", statusKey: "schedule.status.delayed" },
      { time: "17:30", eventKey: "schedule.event.lunchBreak", statusKey: "schedule.status.onTime" },
    ],
  },
  { date: "2025-01-04", events: [] },
  {
    date: "2025-01-05",
    events: [{ time: "13:00", eventKey: "schedule.event.yogaClass", statusKey: "schedule.status.delayed" }],
  },
  {
    date: "2025-01-06",
    events: [],
  },
  { date: "2025-01-07", events: [] },
  { date: "2025-01-08", events: [] },
  {
    date: "2025-01-09",
    events: [{ time: "17:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.delayed" }],
  },
  {
    date: "2025-01-10",
    events: [{ time: "13:30", eventKey: "schedule.event.teamMeeting", statusKey: "schedule.status.delayed" }],
  },
  { date: "2025-01-11", events: [] },
  {
    date: "2025-01-12",
    events: [
      { time: "09:00", eventKey: "schedule.event.teamMeeting", statusKey: "schedule.status.cancelled" },
      { time: "20:00", eventKey: "schedule.event.brainstorming", statusKey: "schedule.status.delayed" },
      { time: "18:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.cancelled" },
    ],
  },
  {
    date: "2025-01-13",
    events: [],
  },
  {
    date: "2025-01-14",
    events: [{ time: "17:00", eventKey: "schedule.event.teamMeeting", statusKey: "schedule.status.cancelled" }],
  },
  {
    date: "2025-01-15",
    events: [
      { time: "16:30", eventKey: "schedule.event.workshop", statusKey: "schedule.status.delayed" },
      { time: "12:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.delayed" },
      { time: "16:00", eventKey: "schedule.event.projectReview", statusKey: "schedule.status.delayed" },
    ],
  },
  { date: "2025-01-16", events: [] },
  {
    date: "2025-01-17",
    events: [
      { time: "11:00", eventKey: "schedule.event.lunchBreak", statusKey: "schedule.status.cancelled" },
      { time: "16:30", eventKey: "schedule.event.workshop", statusKey: "schedule.status.onTime" },
    ],
  },
  { date: "2025-01-18", events: [] },
  {
    date: "2025-01-19",
    events: [{ time: "14:30", eventKey: "schedule.event.workshop", statusKey: "schedule.status.delayed" }],
  },
  {
    date: "2025-01-20",
    events: [],
  },
  {
    date: "2025-01-21",
    events: [
      { time: "19:30", eventKey: "schedule.event.workshop", statusKey: "schedule.status.cancelled" },
      { time: "10:00", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.delayed" },
    ],
  },
  {
    date: "2025-01-22",
    events: [
      { time: "20:00", eventKey: "schedule.event.yogaClass", statusKey: "schedule.status.cancelled" },
      { time: "17:00", eventKey: "schedule.event.brainstorming", statusKey: "schedule.status.cancelled" },
    ],
  },
  {
    date: "2025-01-23",
    events: [{ time: "15:30", eventKey: "schedule.event.workshop", statusKey: "schedule.status.onTime" }],
  },
  {
    date: "2025-01-24",
    events: [
      { time: "18:30", eventKey: "schedule.event.brainstorming", statusKey: "schedule.status.cancelled" },
      { time: "18:00", eventKey: "schedule.event.teamMeeting", statusKey: "schedule.status.cancelled" },
      { time: "19:30", eventKey: "schedule.event.projectReview", statusKey: "schedule.status.cancelled" },
    ],
  },
  {
    date: "2025-01-25",
    events: [
      { time: "09:00", eventKey: "schedule.event.brainstorming", statusKey: "schedule.status.onTime" },
      { time: "17:00", eventKey: "schedule.event.brainstorming", statusKey: "schedule.status.delayed" },
      { time: "17:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.cancelled" },
    ],
  },
  {
    date: "2025-01-26",
    events: [
      { time: "09:00", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.delayed" },
      { time: "09:30", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.onTime" },
    ],
  },
  { date: "2025-01-27", events: [] },
  {
    date: "2025-01-28",
    events: [
      { time: "16:30", eventKey: "schedule.event.lunchBreak", statusKey: "schedule.status.onTime" },
      { time: "17:30", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.delayed" },
      { time: "17:30", eventKey: "schedule.event.workshop", statusKey: "schedule.status.onTime" },
    ],
  },
  {
    date: "2025-01-29",
    events: [
      { time: "09:30", eventKey: "schedule.event.yogaClass", statusKey: "schedule.status.delayed" },
      { time: "12:00", eventKey: "schedule.event.workshop", statusKey: "schedule.status.cancelled" },
    ],
  },
  { date: "2025-01-30", events: [] },
  {
    date: "2025-01-31",
    events: [
      { time: "10:00", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.cancelled" },
    ],
  },
  {
    date: "2025-02-01",
    events: [
      { time: "16:30", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.cancelled" },
    ],
  },
  {
    date: "2025-02-02",
    events: [
      { time: "16:30", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.cancelled" },
    ],
  },
];

const DayCard: React.FC<{ day: ScheduleDay }> = ({ day }) => {
  const { t } = useI18n();
  const dayNames: TranslationKey[] = ["schedule.weekday.sun", "schedule.weekday.mon", "schedule.weekday.tue", "schedule.weekday.wed", "schedule.weekday.thu", "schedule.weekday.fri", "schedule.weekday.sat"];

  return (
    <>
      <div className={classes.daycard} onClick={() => {}}>
        <div className={classes.innercard}>
          <div
            className={classes.dayheader}
            style={{
              display: "flex",
              width: "100%",

              justifyContent: "space-between",
              backgroundColor:
                new Date(day.date).getDate() ==
                  new Date(Date.now()).getDate() &&
                new Date(day.date).getMonth() ==
                  new Date(Date.now()).getMonth() &&
                new Date(day.date).getFullYear() ==
                  new Date(Date.now()).getFullYear()
                  ? "#b3afe8"
                  : "#e0dff6",
            }}
            onClick={() => {
              alert(t("schedule.clickedOn", { date: day.date }));
            }}
          >
            <div
              style={{
                marginLeft: "5px",
                alignSelf: "center",
              }}
            >
              <Text c={new Date(day.date).getDay() == 0 ? "red" : ""}>
                {t(dayNames[new Date(day.date).getDay()])}
              </Text>
            </div>
            <div style={{ marginRight: "5px", marginTop: "0px" }}>
              <Text size="xl" fw={700}>
                {day.date.split("-")[2]}
              </Text>
            </div>
          </div>

          <div
            style={{
              flexDirection: "column",
              width: "100%",
              minHeight: "100%",
            }}
          >
            {Object.values(day.events)
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((event, index) => (
                <div
                  key={"a" + index}
                  className={classes.dayevent}
                  onClick={() => {
                    alert(JSON.stringify(event));
                  }}
                >
                  <Text size="xs">
                    <strong>{event.time}</strong> - {t(event.eventKey)}
                  </Text>
                </div>
              ))}

            <div
              className={classes.addiv}
              onClick={() => {
                alert(JSON.stringify(day));
              }}
            >
              <Text size="xs">
                <strong>{t("schedule.edit")}</strong>
              </Text>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


const ScheduleControls: React.FC<{ month:number, year:number, onChange: (month: number, year: number) => void, scheduleId:number }> = ({ month, year, onChange, scheduleId }) => {

  const { t } = useI18n();
  const monthNames: TranslationKey[] = [
    "schedule.month.january",
    "schedule.month.february",
    "schedule.month.march",
    "schedule.month.april",
    "schedule.month.may",
    "schedule.month.june",
    "schedule.month.july",
    "schedule.month.august",
    "schedule.month.september",
    "schedule.month.october",
    "schedule.month.november",
    "schedule.month.december",
  ];
  
  console.log("ScheduleControls", month, year, onChange)
  
  return (<>
        <Title order={2} mb="lg">
        {t("schedule.monthTitle", { scheduleId, month: t(monthNames[month]), year })}
      </Title>
  </>)
}



const ScheduleMonth: React.FC = () => {

  const dateChange = ()=>{
    console.log("dateChange")
  }

  return (
    <Container
      style={{ maxWidth: "100%", marginLeft: "20px", marginBottom: "20px" }}
    >
<ScheduleControls month={new Date(Date.now()).getMonth()} year={new Date(Date.now()).getFullYear()} scheduleId={1} onChange={dateChange}/>
      <Grid gutter="xs">
        {monthSchedule.map((day, index) => (
          <Grid.Col
            key={"c" + index}
            span={1.7}
            style={{ margin: "0px", padding: "0px" }}
          >
            <DayCard day={day} />
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
};

export default ScheduleMonth;
