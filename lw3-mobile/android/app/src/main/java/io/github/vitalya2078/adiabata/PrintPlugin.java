package io.github.vitalya2078.adiabata;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Печать отчёта системным диалогом Android: принтер или «Сохранить как PDF».
 * Печатается текущая страница приложения; правила @media print оставляют только бланк отчёта (#printroot).
 */
@CapacitorPlugin(name = "Printer")
public class PrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        final String name = call.getString("name", "Отчёт");
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                WebView wv = getBridge().getWebView();
                PrintDocumentAdapter adapter = wv.createPrintDocumentAdapter(name);
                PrintAttributes attrs = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                        .build();
                pm.print(name, adapter, attrs);
                call.resolve();
            } catch (Exception e) {
                call.reject("Печать недоступна: " + e.getMessage());
            }
        });
    }
}
