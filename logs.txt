import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { clienteService } from '../services/clienteService';
import { Cliente } from '../types';

const LoyaltyScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [customer, setCustomer] = useState<Cliente | null>(null);
  const [message, setMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);
  const lastScannedRef = useRef<string>('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    if (scanning) {
      scanner = new Html5Qrcode("reader");

      const startScanning = async () => {
        try {
          await scanner?.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            async (decodedText) => {
              if (processingRef.current || decodedText === lastScannedRef.current) {
                return;
              }

              processingRef.current = true;
              lastScannedRef.current = decodedText;

              if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
              }

              await handleScan(decodedText);

              scanTimeoutRef.current = setTimeout(() => {
                lastScannedRef.current = '';
                processingRef.current = false;
              }, 3000);

              if (scanner) {
                await scanner.stop();
                await scanner.clear();
              }
              setScanning(false);
            },
            (error) => {
              console.error(error);
            }
          );
        } catch (err) {
          setMessage("Error al acceder a la cámara. Por favor, intente de nuevo.");
          setScanning(false);
        }
      };

      startScanning();
    }

    return () => {
      if (scanner?.isScanning) {
        scanner.stop().then(() => scanner?.clear());
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [scanning]);

  const handleScan = async (scannedId: string) => {
    try {
      setLoading(true);
      setMessage('Buscando cliente...');

      const cliente = await clienteService.obtenerCliente(scannedId);

      if (!cliente) {
        setMessage('Cliente no encontrado. Verifique el código QR.');
        setCustomer(null);
        return;
      }

      try {
        setMessage('Registrando visita...');
        setProcessing(true);

        await clienteService.registrarVisita(scannedId);
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        const clienteActualizado = await clienteService.obtenerCliente(scannedId);
        
        if (clienteActualizado) {
          setCustomer(clienteActualizado);
          
          if (clienteActualizado.visitas === 0) {
            setMessage(`¡Felicitaciones! ${clienteActualizado.nombre} ha completado el ciclo de recompensas!`);
          } else {
            const proximaVisita = 5 - (clienteActualizado.visitas % 5);
            setMessage(`¡Visita registrada exitosamente! Faltan ${proximaVisita} visita(s) para la siguiente recompensa.`);
          }

          console.log('Actualización exitosa:', {
            clienteId: scannedId,
            visitasAnteriores: cliente.visitas,
            visitasNuevas: clienteActualizado.visitas,
            pushToken: clienteActualizado.pushToken,
            deviceId: clienteActualizado.deviceLibraryIdentifier
          });
        }
      } catch (error) {
        console.error('Error específico al registrar visita:', error);
        
        if (error instanceof Error) {
          if (error.message.includes('push') || error.message.includes('token')) {
            setMessage('La visita se registró pero hubo un problema actualizando el pase. Por favor, vuelva a añadir el pase a Wallet.');
          } else {
            setMessage('Error al procesar la visita. Por favor, intente de nuevo.');
          }
        } else {
          setMessage('Error desconocido al procesar la visita.');
        }
      }
    } catch (error) {
      console.error('Error general en handleScan:', error);
      setMessage('Error al procesar la visita. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const scanner = new Html5Qrcode("reader");
          const result = await scanner.scanFile(file, true);
          await handleScan(result);
          scanner.clear();
        } catch (error) {
          setMessage("No se pudo leer el código QR de la imagen.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-leu-cream">
      <div className="max-w-md w-full p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-leu-green mb-6 text-center">
            Leu Beauty Scanner
          </h1>

          {!showOptions && !scanning ? (
            <button
              onClick={() => setShowOptions(true)}
              className="w-full py-3 px-4 bg-leu-green text-white rounded-lg hover:bg-opacity-90 mb-4 shadow-md"
              disabled={loading}
            >
              Escanear Pase
            </button>
          ) : null}

          {showOptions && !scanning ? (
            <div className="space-y-3">
              <button
                onClick={() => setScanning(true)}
                className="w-full py-3 px-4 bg-leu-green text-white rounded-lg hover:bg-opacity-90 shadow-md"
                disabled={loading}
              >
                Usar Cámara
              </button>
              <label className="block">
                <button
                  onClick={() => document.getElementById('fileInput')?.click()}
                  className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  disabled={loading}
                >
                  Escanear Imagen
                </button>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={loading}
                />
              </label>
              <button
                onClick={() => setShowOptions(false)}
                className="w-full py-2 px-4 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          ) : null}

          {scanning ? (
            <div>
              <div id="reader" className="mb-4"></div>
              <button
                onClick={() => {
                  setScanning(false);
                  setShowOptions(false);
                }}
                className="w-full mt-2 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          ) : null}

          {loading || processing ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-leu-green mx-auto"></div>
              <p className="text-gray-600 mt-2">
                {processing ? 'Actualizando pase...' : 'Procesando...'}
              </p>
            </div>
          ) : null}

          {customer && (
            <div className="space-y-4 bg-leu-cream p-4 rounded-lg mt-4">
              <h2 className="font-bold text-lg text-leu-green">{customer.nombre}</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Visitas Acumuladas</p>
                  <p className="font-bold text-2xl text-leu-green">{customer.visitas} visitas</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Próxima Recompensa</p>
                  <p className="font-bold text-leu-green">{customer.proximaRecompensa}</p>
                </div>
                <div className="text-xs text-gray-500">
                  Última visita: {customer.ultimaVisita.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded-lg ${
              message.includes('Error') 
                ? 'bg-red-50 text-red-700' 
                : 'bg-green-50 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-2 mb-4 italic">
        Desarrollado por Julio T. para el amor de su vida ❤️
      </p>
    </div>
  );
};

export default LoyaltyScanner;