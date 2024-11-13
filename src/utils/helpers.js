export const generateSerialNumber = () => {
    return 'PASS' + Date.now() + Math.random().toString(36).substring(2, 7).toUpperCase();
  };
  