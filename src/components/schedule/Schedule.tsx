import React from "react";
import { Container, Table, Title, Badge, Group } from "@mantine/core";
import { TranslationKey } from "../../i18n/dictionaries";
import { useI18n } from "../../i18n/I18nContext";

interface ScheduleItem {
  id: number;
  time: string;
  eventKey: TranslationKey;
  statusKey: "schedule.status.onTime" | "schedule.status.delayed" | "schedule.status.cancelled";
}

const schedule: ScheduleItem[] = [
  { id: 1, time: "09:00 AM", eventKey: "schedule.event.teamMeeting", statusKey: "schedule.status.onTime" },
  { id: 2, time: "11:00 AM", eventKey: "schedule.event.clientPresentation", statusKey: "schedule.status.delayed" },
  { id: 3, time: "01:00 PM", eventKey: "schedule.event.lunchBreak", statusKey: "schedule.status.onTime" },
  { id: 4, time: "03:00 PM", eventKey: "schedule.event.projectUpdate", statusKey: "schedule.status.cancelled" },
  { id: 5, time: "05:00 PM", eventKey: "schedule.event.wrapUpMeeting", statusKey: "schedule.status.onTime" },
];

const statusColor = (statusKey: ScheduleItem["statusKey"]) => {
  if (statusKey === "schedule.status.onTime") return "green";
  if (statusKey === "schedule.status.delayed") return "yellow";
  return "red";
};

const Schedule: React.FC = () => {
  const { t } = useI18n();

  return (
    <Container>
      <Title order={2} mb="lg">
        {t("schedule.dailyTitle")}
      </Title>
      <Table highlightOnHover>
        <thead>
          <tr>
            <th>{t("schedule.time")}</th>
            <th>{t("schedule.event")}</th>
            <th>{t("schedule.status")}</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((item) => (
            <tr key={item.id}>
              <td>{item.time}</td>
              <td>{t(item.eventKey)}</td>
              <td>
                <Group>
                  <Badge color={statusColor(item.statusKey)}>{t(item.statusKey)}</Badge>
                </Group>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default Schedule;
