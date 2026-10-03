import { Button, Container, Group, Text, Title } from "@mantine/core";
import classes from "@css/notfound.module.css";
import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <Container className={classes.root}>
      <div className={classes.label}>404</div>
      <div className={classes.content}>
      <Title className={classes.title}>{t("error.secretPlace")}</Title>
      <Text c="dimmed" size="lg" ta="center" className={classes.description}>
        {t("error.notFound.description")}
        <br/>{t("error.notFound.descriptionBreak")}
      </Text>
      <Group justify="center" className={classes.actionDiv} >
        <Button  size="md" color="light.1" component={Link} to="/home/dash" >
          {t("error.toHome")}
        </Button>
      </Group>
      </div>
    </Container>
  );
}
