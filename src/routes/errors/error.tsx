import { Button, Container, Group, Text, Title } from "@mantine/core";
import classes from "@css/notfound.module.css";
import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

export default function ErrorPage() {
  const { t } = useI18n();

  return (
    <Container className={classes.root}>
      
      <div className={classes.labelErr} style={{color:""}}>
   
        500 
        </div>
      <div className={classes.content}>
      <Title className={classes.title}>{t("error.secretPlace")}</Title>
      <Text c="dimmed" size="lg" ta="center" className={classes.description}>
        {t("error.generic.description")}
        <br/>{t("error.generic.support")}
      </Text>
      <Group justify="center" className={classes.actionDiv} >
        <Button  size="md" color="blue" component={Link} to="/home/dash" >
          {t("error.toHome")}
        </Button>
      </Group>
      <Group justify="center" className={classes.actionDiv} >
        <Button  size="md" color="blue" component="a" href="/support" >
          {t("error.supportButton")}
        </Button>
      </Group>
      </div>
    </Container>
  );
}
