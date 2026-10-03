import React, { useCallback } from 'react';
import { Button, Container, Text, Title, Center } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';

const LoggedOut: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleLogin = useCallback(() => {
    navigate('/login'); // Replace '/login' with the path to your login page
  }, [navigate]);

  const [countdown, setCountdown] = React.useState(5);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (countdown === 0) {
      handleLogin();
    }
    }, [countdown, handleLogin]);

  return (
    <Container size="sm" style={{ textAlign: 'center', marginTop: '5rem' }}>
      <Title order={2} mb="md">
        {t("logout.title")}
      </Title>
      <Text color="dimmed" mb="lg">
        {t("logout.description")}
      </Text>
      <Center>
        <Button onClick={handleLogin} size="md" color="light.1">
          {t("logout.button", { countdown })}
        </Button>
      </Center>
    </Container>
  );
};

export default LoggedOut;
