package com.example.helloworld.ui;
import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.helloworld.R;
import com.example.helloworld.model.ConferenceDTO;

import java.util.List;

public class ConferenceAdapter extends RecyclerView.Adapter<ConferenceAdapter.ViewHolder> {

    private final Context context;
    private final List<ConferenceDTO> conferenceList;

    public ConferenceAdapter(Context context, List<ConferenceDTO> conferenceList) {
        this.context = context;
        this.conferenceList = conferenceList;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_conference, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        ConferenceDTO dto = conferenceList.get(position);
        holder.tvTitle.setText(dto.name);
        holder.tvTime.setText(dto.startTime + " ~ " + dto.endTime);
        holder.tvState.setText("状态：" + dto.state);
        holder.tvUser.setText("发布人：" + dto.userName);

        holder.itemView.setOnClickListener(v -> {
            Intent intent = new Intent(context, ConferenceDetailActivity.class);
            intent.putExtra("conferenceId", dto.id);
            context.startActivity(intent);
        });
    }

    @Override
    public int getItemCount() {
        return conferenceList.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvTitle, tvTime, tvState, tvUser;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvTime = itemView.findViewById(R.id.tvTime);
            tvState = itemView.findViewById(R.id.tvState);
            tvUser = itemView.findViewById(R.id.tvUser);
        }
    }
}
