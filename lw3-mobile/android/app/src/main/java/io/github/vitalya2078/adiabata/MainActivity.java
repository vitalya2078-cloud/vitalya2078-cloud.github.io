package io.github.vitalya2078.adiabata;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrintPlugin.class);   // печать отчёта / сохранение в PDF
        super.onCreate(savedInstanceState);
    }
}
