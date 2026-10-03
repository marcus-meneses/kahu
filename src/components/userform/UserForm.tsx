import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

const UserForm = () => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    cpf: "",
    email: "",
    phone: "",
    login: "",
    role: "",
    customer: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.formContainer}>
      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="name">{t("common.fields.name")}:</label>
        <input
          style={styles.input}
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="cpf">{t("common.fields.cpf")}:</label>
        <input
          style={styles.input}
          type="text"
          id="cpf"
          name="cpf"
          value={formData.cpf}
          onChange={handleChange}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="email">{t("common.fields.email")}:</label>
        <input
          style={styles.input}
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="phone">{t("common.fields.phone")}:</label>
        <input
          style={styles.input}
          type="text"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="login">{t("common.fields.login")}:</label>
        <input
          style={styles.input}
          type="text"
          id="login"
          name="login"
          value={formData.login}
          onChange={handleChange}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="role">{t("common.fields.role")}:</label>
        <input
          style={styles.input}
          type="number"
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="customer">{t("common.fields.customer")}:</label>
        <input
          style={styles.input}
          type="text"
          id="customer"
          name="customer"
          value={formData.customer || ''}
          onChange={handleChange}
        />
      </div>

      <button type="submit" style={styles.button}>{t("common.actions.submit")}</button>
    </form>
  );
};

import { CSSProperties } from 'react';

const styles: { [key: string]: CSSProperties } = {
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxWidth: '400px',
    margin: 'auto',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    fontWeight: 'bold',
  },
  input: {
    padding: '0.5rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#007BFF',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default UserForm;
