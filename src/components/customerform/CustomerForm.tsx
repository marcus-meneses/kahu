import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Anchor,
  Button,
  Checkbox,
  Group,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Link, Navigate } from "react-router-dom";
import {
  UserContext,
  UserContextInterface,
} from "../../classes/contexts/UserContext";
import ApiBroker from "../../primitives/ApiBroker";
import classes from "@css/create-account.module.css";

const entryKey = "kahu.hotsiteOnboarding";
const backgrounds = [
  "/photos/1.jpeg",
  "/photos/2.jpeg",
  "/photos/3.jpeg",
  "/photos/4.jpeg",
  "/photos/5.jpeg",
  "/photos/6.jpeg",
  "/photos/7.jpeg",
];
type Option = {
  id: string;
  name?: string;
  namePTBR?: string;
  abbreviation?: string;
};
type Form = {
  companyName: string;
  fiscalName: string;
  cnpj: string;
  companyEmail: string;
  companyPhone: string;
  address: string;
  cep: string;
  countryId: string;
  stateId: string;
  cityId: string;
  stateSubscription: string;
  enterpriseSize: string;
  enterpriseType: string;
  taxRegime: string;
  adminName: string;
  adminCpf: string;
  adminEmail: string;
  adminPhone: string;
  login: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};
const initial: Form = {
  companyName: "",
  fiscalName: "",
  cnpj: "",
  companyEmail: "",
  companyPhone: "",
  address: "",
  cep: "",
  countryId: "",
  stateId: "",
  cityId: "",
  stateSubscription: "",
  enterpriseSize: "",
  enterpriseType: "",
  taxRegime: "",
  adminName: "",
  adminCpf: "",
  adminEmail: "",
  adminPhone: "",
  login: "",
  password: "",
  confirmPassword: "",
  terms: false,
};
const digits = (value: string) => value.replace(/\D/g, "");
const mask = (value: string, pattern: string, max: number) => {
  const source = digits(value).slice(0, max);
  let i = 0;
  return pattern
    .replace(/#/g, () => source[i++] ?? "")
    .replace(/[^0-9]$/g, "")
    .replace(/[./()-]$/g, "");
};
const validCnpj = (value: string) => {
  const n = digits(value);
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const calc = (base: string, w: number[]) => {
    const sum = [...base].reduce((a, d, i) => a + Number(d) * w[i], 0),
      r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(n.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return n.endsWith(`${d1}${d2}`);
};
const validCpf = (value: string) => {
  const n = digits(value);
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  const digit = (base: string, factor: number) => {
    let sum = 0;
    for (const d of base) sum += Number(d) * factor--;
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = digit(n.slice(0, 9), 10),
    d2 = digit(n.slice(0, 9) + d1, 11);
  return n.endsWith(`${d1}${d2}`);
};
const label = (o: Option) => o.namePTBR || o.name || o.abbreviation || o.id;

export default function CustomerForm() {
  const allowed = sessionStorage.getItem(entryKey) === "allowed";
  const context = useContext(UserContext) as UserContextInterface;
  const broker = useMemo(
    () => new ApiBroker(context.config.apiData),
    [context.config.apiData],
  );
  const [form, setForm] = useState(initial),
    [countries, setCountries] = useState<Option[]>([]),
    [states, setStates] = useState<Option[]>([]),
    [cities, setCities] = useState<Option[]>([]),
    [loading, setLoading] = useState(false),
    [success, setSuccess] = useState(false);
  const [backgroundLayers, setBackgroundLayers] = useState<[number, number]>(
    () => {
      const first = Math.floor(Math.random() * backgrounds.length);
      return [first, (first + 1) % backgrounds.length];
    },
  );
  const [visibleBackground, setVisibleBackground] = useState(0);
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const advanceBackground = useCallback(() => {
    setVisibleBackground((current) => {
      const next = current === 0 ? 1 : 0;
      setBackgroundLayers((layers) => {
        const updated: [number, number] = [...layers];
        updated[next] = (layers[current] + 1) % backgrounds.length;
        return updated;
      });
      return next;
    });
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(advanceBackground, 15000);
    return () => window.clearTimeout(timer);
  }, [advanceBackground, visibleBackground]);
  const background = (minimal = false) => (
    <aside className={classes.aside} onClick={advanceBackground}>
      {backgroundLayers.map((index, layer) => (
        <div
          key={layer}
          className={`${classes.backgroundLayer} ${layer === visibleBackground ? classes.backgroundVisible : ""}`}
          style={{ backgroundImage: `url(${backgrounds[index]})` }}
        />
      ))}
      <div className={classes.asideContent}>
        <Link to="/">
          <img className={classes.brand} src="/logo.svg" alt="Kahu" />
        </Link>
        {!minimal && (
          <>
            <div>
              <h1>Comece sua operação no Kahu.</h1>
              <p>
                Cadastre sua empresa e o primeiro usuário gestor. Os demais
                dados operacionais poderão ser configurados depois do acesso.
              </p>
            </div>
            <Anchor className={classes.loginLink} component={Link} to="/login">
              Já tenho uma conta
            </Anchor>
          </>
        )}
      </div>
    </aside>
  );
  useEffect(() => {
    if (!allowed) return;
    broker
      .publicGet<{ data: Option[] }>("/api/onboarding/countries")
      .then((r) => {
        setCountries(r.data);
        const br = r.data.find((c) => c.abbreviation === "BR");
        if (br) set("countryId", br.id);
      })
      .catch(() =>
        notifications.show({
          color: "red",
          message: "Não foi possível carregar os países.",
        }),
      );
  }, [allowed, broker]);
  useEffect(() => {
    if (!form.countryId) return;
    setStates([]);
    setCities([]);
    set("stateId", "");
    set("cityId", "");
    broker
      .publicGet<{ data: Option[] }>(`/api/onboarding/states/${form.countryId}`)
      .then((r) => setStates(r.data))
      .catch(() =>
        notifications.show({
          color: "red",
          message: "Não foi possível carregar os estados.",
        }),
      );
  }, [broker, form.countryId]);
  useEffect(() => {
    if (!form.stateId) return;
    setCities([]);
    set("cityId", "");
    broker
      .publicGet<{ data: Option[] }>(`/api/onboarding/cities/${form.stateId}`)
      .then((r) => setCities(r.data))
      .catch(() =>
        notifications.show({
          color: "red",
          message: "Não foi possível carregar as cidades.",
        }),
      );
  }, [broker, form.stateId]);
  if (!allowed) return <Navigate to="/" replace />;
  const submit = async () => {
    if (!validCnpj(form.cnpj) || !validCpf(form.adminCpf)) {
      notifications.show({
        color: "red",
        message: "Revise o CNPJ e o CPF informados.",
      });
      return;
    }
    if (form.password !== form.confirmPassword) {
      notifications.show({ color: "red", message: "As senhas não coincidem." });
      return;
    }
    if (
      !form.cityId ||
      !form.enterpriseSize ||
      !form.enterpriseType ||
      !form.taxRegime ||
      !form.terms
    ) {
      notifications.show({
        color: "red",
        message: "Preencha todos os campos obrigatórios e aceite os termos.",
      });
      return;
    }
    setLoading(true);
    try {
      await broker.publicPost("/api/onboarding", {
        company: {
          name: form.companyName,
          fiscalName: form.fiscalName,
          cnpj: form.cnpj,
          email: form.companyEmail,
          phone: form.companyPhone,
          address: form.address,
          cep: form.cep,
          cityId: form.cityId,
          stateSubscription: form.stateSubscription,
          enterpriseSize: form.enterpriseSize,
          enterpriseType: form.enterpriseType,
          taxRegime: form.taxRegime,
          timezone: "UTC-03",
        },
        administrator: {
          name: form.adminName,
          cpf: form.adminCpf,
          email: form.adminEmail,
          phone: form.adminPhone,
          login: form.login,
          password: form.password,
        },
      });
      sessionStorage.removeItem(entryKey);
      setSuccess(true);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Não foi possível criar a conta",
        message: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };
  if (success)
    return (
      <main className={classes.page}>
        {background(true)}
        <section className={classes.content}>
          <div className={classes.success}>
            <Title order={2}>Conta criada</Title>
            <Text>
              O cadastro da empresa e do usuário gestor foi concluído. Você já
              pode entrar no Kahu com o login informado.
            </Text>
            <Button component={Link} to="/login" color="light.1" mt="xl">
              Ir para o login
            </Button>
          </div>
        </section>
      </main>
    );
  return (
    <main className={classes.page}>
      {background()}
      <section className={classes.content}>
        <form
          className={classes.form}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className={classes.heading}>
            <Title order={2}>Criar conta</Title>
            <Text>Os campos marcados com * são obrigatórios.</Text>
          </div>
          <section>
            <h3 className={classes.sectionTitle}>Empresa</h3>
            <div className={classes.grid}>
              <TextInput
                required
                label="Nome comercial"
                value={form.companyName}
                onChange={(e) => set("companyName", e.currentTarget.value)}
              />
              <TextInput
                required
                label="Razão social"
                value={form.fiscalName}
                onChange={(e) => set("fiscalName", e.currentTarget.value)}
              />
              <TextInput
                required
                label="CNPJ"
                value={form.cnpj}
                onChange={(e) =>
                  set(
                    "cnpj",
                    mask(e.currentTarget.value, "##.###.###/####-##", 14),
                  )
                }
              />
              <TextInput
                label="Inscrição estadual"
                value={form.stateSubscription}
                onChange={(e) =>
                  set(
                    "stateSubscription",
                    digits(e.currentTarget.value).slice(0, 9),
                  )
                }
              />
              <TextInput
                required
                type="email"
                label="E-mail da empresa"
                value={form.companyEmail}
                onChange={(e) => set("companyEmail", e.currentTarget.value)}
              />
              <TextInput
                required
                label="Telefone da empresa"
                value={form.companyPhone}
                onChange={(e) =>
                  set(
                    "companyPhone",
                    mask(e.currentTarget.value, "(##)#####-####", 11),
                  )
                }
              />
            </div>
          </section>
          <section className={classes.section}>
            <h3 className={classes.sectionTitle}>Endereço</h3>
            <div className={classes.grid}>
              <TextInput
                required
                className={classes.full}
                label="Endereço"
                value={form.address}
                onChange={(e) => set("address", e.currentTarget.value)}
              />
              <TextInput
                required
                label="CEP"
                value={form.cep}
                onChange={(e) =>
                  set("cep", mask(e.currentTarget.value, "#####-###", 8))
                }
              />
              <Select
                required
                searchable
                label="País"
                data={countries.map((o) => ({ value: o.id, label: label(o) }))}
                value={form.countryId}
                onChange={(v) => set("countryId", v || "")}
              />
              <Select
                required
                searchable
                label="Estado"
                data={states.map((o) => ({ value: o.id, label: label(o) }))}
                value={form.stateId}
                onChange={(v) => set("stateId", v || "")}
              />
              <Select
                required
                searchable
                label="Cidade"
                data={cities.map((o) => ({ value: o.id, label: label(o) }))}
                value={form.cityId}
                onChange={(v) => set("cityId", v || "")}
              />
            </div>
          </section>
          <section className={classes.section}>
            <h3 className={classes.sectionTitle}>Perfil fiscal</h3>
            <div className={classes.grid}>
              <Select
                required
                label="Porte da empresa"
                data={[
                  ["MEI", "MEI"],
                  ["ME", "Microempresa"],
                  ["EPP", "Empresa de pequeno porte"],
                  ["EMGP", "Média ou grande empresa"],
                ].map(([value, label]) => ({ value, label }))}
                value={form.enterpriseSize}
                onChange={(v) => set("enterpriseSize", v || "")}
              />
              <Select
                required
                label="Tipo jurídico"
                data={["LTDA", "SLU", "EI", "MEI", "S/A"]}
                value={form.enterpriseType}
                onChange={(v) => set("enterpriseType", v || "")}
              />
              <Select
                required
                label="Regime tributário"
                data={["SIMPLES", "SIMEI", "LUCRO PRESUMIDO", "LUCRO REAL"]}
                value={form.taxRegime}
                onChange={(v) => set("taxRegime", v || "")}
              />
            </div>
          </section>
          <section className={classes.section}>
            <h3 className={classes.sectionTitle}>Usuário gestor</h3>
            <div className={classes.autofillTrap} aria-hidden="true">
              <input type="text" name="username" autoComplete="username" tabIndex={-1} />
              <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
            </div>
            <div className={classes.grid}>
              <TextInput
                required
                className={classes.full}
                name="kahu_onboarding_admin_full_name"
                autoComplete="section-kahu-onboarding off"
                label="Nome completo"
                value={form.adminName}
                onChange={(e) => set("adminName", e.currentTarget.value)}
              />
              <TextInput
                required
                name="kahu_onboarding_admin_cpf"
                autoComplete="section-kahu-onboarding off"
                label="CPF"
                value={form.adminCpf}
                onChange={(e) =>
                  set(
                    "adminCpf",
                    mask(e.currentTarget.value, "###.###.###-##", 11),
                  )
                }
              />
              <TextInput
                required
                name="kahu_onboarding_admin_phone"
                autoComplete="section-kahu-onboarding off"
                label="Telefone"
                value={form.adminPhone}
                onChange={(e) =>
                  set(
                    "adminPhone",
                    mask(e.currentTarget.value, "(##)#####-####", 11),
                  )
                }
              />
              <TextInput
                required
                type="email"
                name="kahu_onboarding_admin_email"
                autoComplete="section-kahu-onboarding off"
                label="E-mail"
                value={form.adminEmail}
                onChange={(e) => set("adminEmail", e.currentTarget.value)}
              />
              <TextInput
                required
                name="kahu_onboarding_new_identity"
                autoComplete="section-kahu-onboarding off"
                label="Login"
                value={form.login}
                onChange={(e) => set("login", e.currentTarget.value)}
              />
              <PasswordInput
                required
                name="kahu_onboarding_new_secret"
                autoComplete="section-kahu-onboarding new-password"
                label="Senha"
                description="Mínimo de 8 caracteres"
                value={form.password}
                onChange={(e) => set("password", e.currentTarget.value)}
              />
              <PasswordInput
                required
                name="kahu_onboarding_confirm_secret"
                autoComplete="section-kahu-onboarding new-password"
                label="Confirmar senha"
                description="Mínimo de 8 caracteres"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.currentTarget.value)}
              />
            </div>
          </section>
          <Stack className={classes.section}>
            <Checkbox
              required
              color="light.1"
              checked={form.terms}
              onChange={(e) => set("terms", e.currentTarget.checked)}
              label="Confirmo que os dados são verdadeiros e aceito os termos de uso e a política de privacidade."
            />
            <Group className={classes.actions} justify="flex-end">
              <Anchor component={Link} to="/">
                Voltar ao site
              </Anchor>
              <Button type="submit" color="light.1" size="md" loading={loading}>
                Criar conta
              </Button>
            </Group>
          </Stack>
        </form>
      </section>
    </main>
  );
}
