package com.example.helloworld.ui;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.TextView;
import com.example.helloworld.MainActivity;

import com.example.helloworld.R;

import java.util.List;

public class GridAdapter extends BaseAdapter {

    private final Context context;
    private final List<MainActivity.GridItem> items;

    public GridAdapter(Context context, List<MainActivity.GridItem> items) {
        this.context = context;
        this.items = items;
    }

    @Override
    public int getCount() {
        return items.size();
    }

    @Override
    public Object getItem(int position) {
        return items.get(position);
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {
        if (convertView == null) {
            convertView = LayoutInflater.from(context).inflate(R.layout.grid_item, parent, false);
        }

        MainActivity.GridItem item = items.get(position);

        TextView tvTitle = convertView.findViewById(R.id.tvTitle);
        TextView tvContent = convertView.findViewById(R.id.tvContent);

        tvTitle.setText(item.getTitle());
        tvContent.setText(item.getContent());

        return convertView;
    }
}
