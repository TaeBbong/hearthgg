import 'package:flutter/material.dart';

class RankCard extends StatelessWidget {
  final Map<String, dynamic> rankData;

  RankCard({required this.rankData});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              leading: CircleAvatar(
                child:
                    Text(rankData['accountid'].substring(0, 1).toUpperCase()),
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
              title: Text(rankData['accountid'],
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              subtitle: Text('순위: ${rankData['rank']}등'),
            ),
            Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text('평균승수: ${rankData['rating']}',
                            style: TextStyle(fontSize: 16)),
                      ],
                    ),
                  ],
                ),
                // ElevatedButton( // 이미지로 저장하기
                //   onPressed: () {
                //     // Perform some action
                //   },
                //   child: Text('Action'),
                // ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
