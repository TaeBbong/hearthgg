import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/home_controller.dart';
import '../models/rankdata.dart';
import '../constants/area.dart';
import '../services/main_service.dart';
import '../widgets/loading_indicator.dart';
import '../widgets/rank_card.dart';
import '../widgets/footer.dart';

class MobileScreen extends GetView<HomeController> {
  MobileScreen({super.key});

  final mainService = Get.find<MainService>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hearth.gg'),
        actions: [
          Switch(
            value: mainService.isDarkMode,
            onChanged: mainService.changeMode,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: FutureBuilder(
          future: mainService.fetchSeason(),
          builder: (BuildContext context, AsyncSnapshot snapshot) {
            if (!snapshot.hasData) {
              return Container();
            } else if (snapshot.hasError) {
              return const Center(
                child: Text('에러가 발생했습니다! 다시 한 번 시도해주세요.'),
              );
            }
            Map<String, dynamic> seasons = snapshot.data;
            return GetBuilder<HomeController>(builder: (controller) {
              return Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Row(
                              children: [
                                Expanded(
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButtonFormField<AreaLabel>(
                                      value: controller.searchParams['area'],
                                      items: AreaLabel.values
                                          .map<DropdownMenuItem<AreaLabel>>(
                                              (AreaLabel value) {
                                        return DropdownMenuItem<AreaLabel>(
                                          value: value,
                                          child: Text(
                                            value.text,
                                            style:
                                                const TextStyle(fontSize: 12),
                                          ),
                                        );
                                      }).toList(),
                                      onChanged: (area) =>
                                          controller.updateArea(area!),
                                      itemHeight: 50,
                                      isExpanded: true,
                                      decoration: const InputDecoration(
                                        enabledBorder: OutlineInputBorder(
                                          borderSide: BorderSide(
                                              color: Colors.grey, width: 1),
                                        ),
                                        border: OutlineInputBorder(),
                                        filled: false,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 1),
                                Expanded(
                                  flex: 1,
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButtonFormField<int>(
                                      value:
                                          seasons[controller.selectedMode.code]!
                                              .last as int,
                                      items:
                                          seasons[controller.selectedMode.code]!
                                              .map<DropdownMenuItem<int>>(
                                                  (dynamic season) {
                                        return DropdownMenuItem<int>(
                                          value: season,
                                          child: Text(
                                            season.toString(),
                                            style:
                                                const TextStyle(fontSize: 12),
                                          ),
                                        );
                                      }).toList(),
                                      onChanged: (season) =>
                                          controller.updateSeason(season!),
                                      isExpanded: true,
                                      decoration: const InputDecoration(
                                        enabledBorder: OutlineInputBorder(
                                          borderSide: BorderSide(
                                              color: Colors.grey, width: 1),
                                        ),
                                        border: OutlineInputBorder(),
                                        filled: false,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 1),
                                Expanded(
                                  flex: 3,
                                  child: TextFormField(
                                    controller: controller.battleTagController,
                                    onFieldSubmitted: (_) async =>
                                        await controller.performSearch(),
                                    decoration: InputDecoration(
                                      hintText: '배틀태그를 입력하세요. (ex: Flurry)',
                                      hintStyle: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold),
                                      border: const OutlineInputBorder(),
                                      suffixIcon: IconButton(
                                        icon: const Icon(Icons.search),
                                        onPressed: () async =>
                                            await controller.performSearch(),
                                      ),
                                      contentPadding: const EdgeInsets.fromLTRB(
                                          15, 22, 10, 22),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          controller.isSearching
                              ? const LoadingIndicator()
                              : controller.isResult
                                  ? SizedBox(
                                      width: MediaQuery.of(context).size.width *
                                          0.8,
                                      child: RankCard(
                                          rankData: RankData.fromJson(
                                              controller.searchResult)),
                                    )
                                  : Container(),
                        ],
                      ),
                    ),
                  ),
                  Footer(),
                ],
              );
            });
          }),
    );
  }
}
